use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

/// Port range for the hook server
const PORT_RANGE_START: u16 = 23456;
const PORT_RANGE_END: u16 = 23460;

/// A message received from Claude Code hooks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookMessage {
    /// The hook event type, e.g. "notification", "status", "command", "output"
    #[serde(default)]
    pub event: String,

    /// Session ID from Claude Code
    #[serde(default)]
    pub session_id: String,

    /// The payload data (varies by event type)
    #[serde(default)]
    pub data: serde_json::Value,

    /// Timestamp (ISO 8601)
    #[serde(default)]
    pub timestamp: String,
}

/// Event emitted to the frontend
#[derive(Debug, Clone, Serialize)]
pub struct HookEvent {
    pub event: String,
    pub session_id: String,
    pub data: serde_json::Value,
    pub timestamp: String,
}

/// Start the TCP hook server. Tries each port in the range until one binds successfully.
/// Runs in a background thread and emits events to the Tauri frontend.
pub fn start_hook_server(app: AppHandle) -> Result<u16, String> {
    let shutdown = Arc::new(AtomicBool::new(false));

    // Try each port in the range
    let mut bound_port: Option<u16> = None;
    let mut listener: Option<TcpListener> = None;

    for port in PORT_RANGE_START..=PORT_RANGE_END {
        match TcpListener::bind(format!("127.0.0.1:{}", port)) {
            Ok(l) => {
                // Set non-blocking so we can check the shutdown flag
                l.set_nonblocking(true)
                    .map_err(|e| format!("Failed to set non-blocking: {}", e))?;
                bound_port = Some(port);
                listener = Some(l);
                break;
            }
            Err(_) => continue,
        }
    }

    let port = bound_port.ok_or("Failed to bind to any port in range 23456-23460")?;
    let tcp_listener = listener.unwrap();

    println!("TermiPet hook server listening on 127.0.0.1:{}", port);

    // Emit the port number so the frontend knows where to connect
    let _ = app.emit("hook-server-port", port);

    let shutdown_clone = shutdown.clone();
    let app_clone = app.clone();

    // Store the shutdown flag on the app state for cleanup
    app.manage(HookServerState {
        shutdown: shutdown.clone(),
        port,
    });

    std::thread::spawn(move || {
        run_server_loop(tcp_listener, app_clone, shutdown_clone);
    });

    Ok(port)
}

/// State managed by the hook server for graceful shutdown
pub struct HookServerState {
    pub shutdown: Arc<AtomicBool>,
    pub port: u16,
}

fn run_server_loop(listener: TcpListener, app: AppHandle, shutdown: Arc<AtomicBool>) {
    loop {
        if shutdown.load(Ordering::Relaxed) {
            println!("Hook server shutting down");
            break;
        }

        match listener.accept() {
            Ok((stream, addr)) => {
                println!("Hook server: connection from {}", addr);
                let app_handle = app.clone();

                std::thread::spawn(move || {
                    handle_connection(stream, app_handle);
                });
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                // No connection ready, sleep briefly and retry
                std::thread::sleep(std::time::Duration::from_millis(100));
                continue;
            }
            Err(e) => {
                eprintln!("Hook server accept error: {}", e);
                std::thread::sleep(std::time::Duration::from_millis(500));
            }
        }
    }
}

fn handle_connection(stream: std::net::TcpStream, app: AppHandle) {
    // Set blocking for this connection
    if let Err(e) = stream.set_nonblocking(false) {
        eprintln!("Failed to set blocking mode: {}", e);
        return;
    }

    // Set a read timeout so we don't block forever
    if let Err(e) = stream.set_read_timeout(Some(std::time::Duration::from_secs(30))) {
        eprintln!("Failed to set read timeout: {}", e);
        return;
    }

    let reader = BufReader::new(&stream);
    let mut write_stream = stream.try_clone().unwrap_or_else(|_| {
        eprintln!("Failed to clone stream");
        // This is a fallback; in practice try_clone rarely fails
        panic!("Stream clone failed");
    });

    let mut buffer = String::new();
    let mut content_length: Option<usize> = None;

    for line_result in reader.lines() {
        let line = match line_result {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Hook server read error: {}", e);
                break;
            }
        };

        // Simple protocol: each line is a JSON message, OR we handle HTTP-like framing
        // Try to parse the line as JSON directly (simple newline-delimited JSON protocol)
        if line.is_empty() {
            // If we were reading HTTP-style headers, the body follows
            if let Some(len) = content_length {
                // We already consumed headers; read `len` bytes for the body.
                // But since we're using a line-based reader this gets tricky.
                // For simplicity, continue reading lines until we have enough data.
                // In practice, Claude Code hooks send newline-delimited JSON.
                let _ = len; // used HTTP path — fallback below
            }
            continue;
        }

        // Check for HTTP-style Content-Length header
        if line.to_lowercase().starts_with("content-length:") {
            if let Ok(len) = line[15..].trim().parse::<usize>() {
                content_length = Some(len);
            }
            continue;
        }

        // Skip HTTP method lines and other headers
        if line.starts_with("POST ")
            || line.starts_with("GET ")
            || line.starts_with("HTTP/")
            || line.contains(':') && !line.starts_with('{')
        {
            continue;
        }

        // Try to parse as JSON
        buffer.push_str(&line);

        match serde_json::from_str::<HookMessage>(&buffer) {
            Ok(msg) => {
                let hook_event = HookEvent {
                    event: msg.event.clone(),
                    session_id: msg.session_id.clone(),
                    data: msg.data.clone(),
                    timestamp: if msg.timestamp.is_empty() {
                        chrono_now()
                    } else {
                        msg.timestamp.clone()
                    },
                };

                // Emit event to all windows
                if let Err(e) = app.emit("hook-message", &hook_event) {
                    eprintln!("Failed to emit hook event: {}", e);
                }

                // Also emit a typed event based on the event field
                if !msg.event.is_empty() {
                    let event_name = format!("hook-{}", msg.event);
                    let _ = app.emit(&event_name, &hook_event);
                }

                // Send acknowledgement
                let ack = serde_json::json!({"status": "ok"});
                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    ack.to_string().len(),
                    ack
                );
                let _ = write_stream.write_all(response.as_bytes());
                let _ = write_stream.flush();

                buffer.clear();
            }
            Err(_) => {
                // Maybe multi-line JSON; keep accumulating
                buffer.push('\n');
            }
        }
    }
}

/// Simple timestamp generator without requiring the `chrono` crate
fn chrono_now() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let duration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    format!("{}", duration.as_secs())
}

/// Tauri command to get the hook server port
#[tauri::command]
pub fn get_hook_server_port(app: AppHandle) -> Result<u16, String> {
    match app.try_state::<HookServerState>() {
        Some(state) => Ok(state.port),
        None => Err("Hook server not started".into()),
    }
}
