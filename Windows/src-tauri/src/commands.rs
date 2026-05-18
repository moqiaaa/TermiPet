use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// ---------------------------------------------------------------------------
// Data types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetMetadata {
    pub id: String,
    #[serde(rename = "displayName")]
    pub display_name: String,
    pub description: String,
    #[serde(rename = "spritesheetPath")]
    pub spritesheet_path: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PetPackage {
    pub metadata: PetMetadata,
    pub directory: String,
    pub is_bundled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultCommand {
    pub label: String,
    pub command: String,
    pub description: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub provider: String,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub messages: Vec<ChatMessage>,
    pub system_prompt: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub content: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalProcess {
    pub pid: u32,
    pub name: String,
    pub command: String,
}

// ---------------------------------------------------------------------------
// Helper: resolve app data directory
// ---------------------------------------------------------------------------

fn get_app_data_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))
}

fn ensure_dir(path: &PathBuf) -> Result<(), String> {
    if !path.exists() {
        fs::create_dir_all(path).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
pub fn get_app_data_dir(app: AppHandle) -> Result<String, String> {
    let dir = get_app_data_path(&app)?;
    ensure_dir(&dir)?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_pet_packages(app: AppHandle) -> Result<Vec<PetPackage>, String> {
    let mut packages: Vec<PetPackage> = Vec::new();

    // 1. Scan bundled Pets/ directory (next to the executable / in resources)
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled_pets_dir = resource_dir.join("Pets");
        if bundled_pets_dir.exists() {
            scan_pets_directory(&bundled_pets_dir, true, &mut packages)?;
        }
    }

    // 2. Scan imported pets in app data directory
    let app_data = get_app_data_path(&app)?;
    let imported_pets_dir = app_data.join("pets");
    if imported_pets_dir.exists() {
        scan_pets_directory(&imported_pets_dir, false, &mut packages)?;
    }

    Ok(packages)
}

fn scan_pets_directory(
    dir: &PathBuf,
    is_bundled: bool,
    packages: &mut Vec<PetPackage>,
) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read pets dir: {}", e))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let pet_json_path = path.join("pet.json");
        if !pet_json_path.exists() {
            continue;
        }

        let content = fs::read_to_string(&pet_json_path)
            .map_err(|e| format!("Failed to read pet.json at {:?}: {}", pet_json_path, e))?;

        match serde_json::from_str::<PetMetadata>(&content) {
            Ok(mut metadata) => {
                metadata.source_dir = Some(path.to_string_lossy().to_string());
                packages.push(PetPackage {
                    metadata,
                    directory: path.to_string_lossy().to_string(),
                    is_bundled,
                });
            }
            Err(e) => {
                eprintln!(
                    "Warning: failed to parse pet.json at {:?}: {}",
                    pet_json_path, e
                );
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub fn get_pet_metadata(path: String) -> Result<PetMetadata, String> {
    let pet_json_path = PathBuf::from(&path).join("pet.json");
    let content = fs::read_to_string(&pet_json_path)
        .map_err(|e| format!("Failed to read pet.json: {}", e))?;
    serde_json::from_str::<PetMetadata>(&content)
        .map_err(|e| format!("Failed to parse pet.json: {}", e))
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: serde_json::Value) -> Result<(), String> {
    let app_data = get_app_data_path(&app)?;
    ensure_dir(&app_data)?;

    let settings_path = app_data.join("settings.json");
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&settings_path, content)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Result<serde_json::Value, String> {
    let app_data = get_app_data_path(&app)?;
    let settings_path = app_data.join("settings.json");

    if !settings_path.exists() {
        return Ok(serde_json::json!({}));
    }

    let content = fs::read_to_string(&settings_path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    serde_json::from_str::<serde_json::Value>(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))
}

#[tauri::command]
pub fn get_default_commands() -> Vec<DefaultCommand> {
    vec![
        DefaultCommand {
            label: "claude".into(),
            command: "claude".into(),
            description: "Start Claude Code interactive session".into(),
            category: "launch".into(),
        },
        DefaultCommand {
            label: "claude --enable-auto-mode".into(),
            command: "claude --enable-auto-mode".into(),
            description: "Start Claude Code with auto mode enabled".into(),
            category: "launch".into(),
        },
        DefaultCommand {
            label: "claude --dangerously-skip-permissions".into(),
            command: "claude --dangerously-skip-permissions".into(),
            description: "Start Claude Code skipping permission prompts".into(),
            category: "launch".into(),
        },
        DefaultCommand {
            label: "/compact".into(),
            command: "/compact".into(),
            description: "Compact conversation to save context".into(),
            category: "session".into(),
        },
        DefaultCommand {
            label: "/init".into(),
            command: "/init".into(),
            description: "Initialize CLAUDE.md in current project".into(),
            category: "session".into(),
        },
        DefaultCommand {
            label: "/clear".into(),
            command: "/clear".into(),
            description: "Clear conversation history".into(),
            category: "session".into(),
        },
        DefaultCommand {
            label: "/memory".into(),
            command: "/memory".into(),
            description: "Edit CLAUDE.md memory files".into(),
            category: "session".into(),
        },
        DefaultCommand {
            label: "/model".into(),
            command: "/model".into(),
            description: "Switch AI model".into(),
            category: "session".into(),
        },
        DefaultCommand {
            label: "/help".into(),
            command: "/help".into(),
            description: "Show help information".into(),
            category: "info".into(),
        },
        DefaultCommand {
            label: "/review".into(),
            command: "/review".into(),
            description: "Review code changes".into(),
            category: "tools".into(),
        },
        DefaultCommand {
            label: "/status".into(),
            command: "/status".into(),
            description: "Show current session status".into(),
            category: "info".into(),
        },
        DefaultCommand {
            label: "/diff".into(),
            command: "/diff".into(),
            description: "Show uncommitted changes".into(),
            category: "tools".into(),
        },
        DefaultCommand {
            label: "/cost".into(),
            command: "/cost".into(),
            description: "Show token usage and costs".into(),
            category: "info".into(),
        },
        DefaultCommand {
            label: "/login".into(),
            command: "/login".into(),
            description: "Login to Anthropic account".into(),
            category: "config".into(),
        },
        DefaultCommand {
            label: "/config".into(),
            command: "/config".into(),
            description: "Open configuration settings".into(),
            category: "config".into(),
        },
        DefaultCommand {
            label: "/mcp".into(),
            command: "/mcp".into(),
            description: "Manage MCP server connections".into(),
            category: "config".into(),
        },
        DefaultCommand {
            label: "/doctor".into(),
            command: "/doctor".into(),
            description: "Diagnose installation issues".into(),
            category: "tools".into(),
        },
        DefaultCommand {
            label: "/terminal-setup".into(),
            command: "/terminal-setup".into(),
            description: "Set up terminal integration".into(),
            category: "config".into(),
        },
    ]
}

#[tauri::command]
pub async fn send_chat_message(request: ChatRequest) -> Result<ChatResponse, String> {
    let url = build_chat_url(&request)?;
    let body = build_chat_body(&request)?;

    let response = send_http_request(&url, &body, &request).await?;
    let content = parse_chat_response(&request.provider, &response)?;

    Ok(ChatResponse {
        content,
        error: None,
    })
}

fn build_chat_url(request: &ChatRequest) -> Result<String, String> {
    match request.provider.as_str() {
        "ollama" => {
            let base = request
                .base_url
                .as_deref()
                .unwrap_or("http://localhost:11434");
            Ok(format!("{}/api/chat", base))
        }
        "openai" => {
            let base = request
                .base_url
                .as_deref()
                .unwrap_or("https://api.openai.com/v1");
            Ok(format!("{}/chat/completions", base))
        }
        "google" => {
            let api_key = request.api_key.as_deref().unwrap_or("");
            let base = request
                .base_url
                .as_deref()
                .unwrap_or("https://generativelanguage.googleapis.com/v1beta");
            Ok(format!(
                "{}/models/{}:generateContent?key={}",
                base, request.model, api_key
            ))
        }
        "custom" => {
            let base = request
                .base_url
                .as_deref()
                .ok_or("Custom provider requires a base URL")?;
            Ok(format!("{}/chat/completions", base))
        }
        _ => Err(format!("Unsupported provider: {}", request.provider)),
    }
}

fn build_chat_body(request: &ChatRequest) -> Result<serde_json::Value, String> {
    match request.provider.as_str() {
        "ollama" => {
            let mut messages: Vec<serde_json::Value> = Vec::new();
            if let Some(ref sys) = request.system_prompt {
                messages.push(serde_json::json!({
                    "role": "system",
                    "content": sys
                }));
            }
            for msg in &request.messages {
                messages.push(serde_json::json!({
                    "role": msg.role,
                    "content": msg.content
                }));
            }
            Ok(serde_json::json!({
                "model": request.model,
                "messages": messages,
                "stream": false
            }))
        }
        "openai" | "custom" => {
            let mut messages: Vec<serde_json::Value> = Vec::new();
            if let Some(ref sys) = request.system_prompt {
                messages.push(serde_json::json!({
                    "role": "system",
                    "content": sys
                }));
            }
            for msg in &request.messages {
                messages.push(serde_json::json!({
                    "role": msg.role,
                    "content": msg.content
                }));
            }
            Ok(serde_json::json!({
                "model": request.model,
                "messages": messages
            }))
        }
        "google" => {
            let mut contents: Vec<serde_json::Value> = Vec::new();
            for msg in &request.messages {
                let role = if msg.role == "assistant" {
                    "model"
                } else {
                    "user"
                };
                contents.push(serde_json::json!({
                    "role": role,
                    "parts": [{"text": msg.content}]
                }));
            }
            let mut body = serde_json::json!({ "contents": contents });
            if let Some(ref sys) = request.system_prompt {
                body["systemInstruction"] = serde_json::json!({
                    "parts": [{"text": sys}]
                });
            }
            Ok(body)
        }
        _ => Err(format!("Unsupported provider: {}", request.provider)),
    }
}

async fn send_http_request(
    url: &str,
    body: &serde_json::Value,
    request: &ChatRequest,
) -> Result<String, String> {
    let stream = TcpStream::connect(extract_host_port(url)?).map_err(|e| {
        format!(
            "Failed to connect to {} provider: {}",
            request.provider, e
        )
    })?;

    let (host, path) = split_url(url)?;
    let body_str = serde_json::to_string(body).map_err(|e| format!("JSON error: {}", e))?;

    let mut headers = format!(
        "POST {} HTTP/1.1\r\nHost: {}\r\nContent-Type: application/json\r\nContent-Length: {}\r\n",
        path,
        host,
        body_str.len()
    );

    // Add authorization header for providers that need it
    if let Some(ref api_key) = request.api_key {
        if request.provider == "openai" || request.provider == "custom" {
            headers.push_str(&format!("Authorization: Bearer {}\r\n", api_key));
        }
    }

    headers.push_str("Connection: close\r\n\r\n");

    let request_bytes = format!("{}{}", headers, body_str);

    // Handle TLS vs plain
    if url.starts_with("https://") {
        // For HTTPS we cannot use raw TCP — fall back to a spawned curl process
        send_via_curl(url, &body_str, request).await
    } else {
        // Plain HTTP (typical for Ollama on localhost)
        let mut stream_clone = stream;
        stream_clone
            .write_all(request_bytes.as_bytes())
            .map_err(|e| format!("Write error: {}", e))?;
        stream_clone
            .flush()
            .map_err(|e| format!("Flush error: {}", e))?;

        let reader = BufReader::new(stream_clone);
        let mut response_body = String::new();
        let mut in_body = false;

        for line in reader.lines() {
            let line = line.map_err(|e| format!("Read error: {}", e))?;
            if in_body {
                response_body.push_str(&line);
                response_body.push('\n');
            } else if line.is_empty() {
                in_body = true;
            }
        }

        Ok(response_body)
    }
}

async fn send_via_curl(
    url: &str,
    body: &str,
    request: &ChatRequest,
) -> Result<String, String> {
    let mut cmd = tokio::process::Command::new("curl");
    cmd.arg("-s")
        .arg("-X")
        .arg("POST")
        .arg(url)
        .arg("-H")
        .arg("Content-Type: application/json");

    if let Some(ref api_key) = request.api_key {
        if request.provider == "openai" || request.provider == "custom" {
            cmd.arg("-H")
                .arg(format!("Authorization: Bearer {}", api_key));
        }
    }

    cmd.arg("-d").arg(body);

    let output = cmd
        .output()
        .await
        .map_err(|e| format!("Failed to run curl: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("curl failed: {}", stderr));
    }

    String::from_utf8(output.stdout).map_err(|e| format!("UTF-8 error: {}", e))
}

fn parse_chat_response(provider: &str, response: &str) -> Result<String, String> {
    let trimmed = response.trim();
    if trimmed.is_empty() {
        return Err("Empty response from provider".into());
    }

    let json: serde_json::Value =
        serde_json::from_str(trimmed).map_err(|e| format!("Failed to parse response: {}", e))?;

    match provider {
        "ollama" => json["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "No content in Ollama response".into()),
        "openai" | "custom" => json["choices"][0]["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "No content in OpenAI response".into()),
        "google" => json["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| "No content in Google response".into()),
        _ => Err(format!("Unsupported provider: {}", provider)),
    }
}

fn extract_host_port(url: &str) -> Result<String, String> {
    let without_scheme = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .ok_or("Invalid URL scheme")?;

    let host_port = without_scheme.split('/').next().unwrap_or(without_scheme);

    if host_port.contains(':') {
        Ok(host_port.to_string())
    } else if url.starts_with("https://") {
        Ok(format!("{}:443", host_port))
    } else {
        Ok(format!("{}:80", host_port))
    }
}

fn split_url(url: &str) -> Result<(String, String), String> {
    let without_scheme = url
        .strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .ok_or("Invalid URL scheme")?;

    let slash_pos = without_scheme.find('/').unwrap_or(without_scheme.len());
    let host = &without_scheme[..slash_pos];
    let path = if slash_pos < without_scheme.len() {
        &without_scheme[slash_pos..]
    } else {
        "/"
    };

    Ok((host.to_string(), path.to_string()))
}

#[tauri::command]
pub fn import_pet_package(app: AppHandle, source_path: String) -> Result<PetPackage, String> {
    let source = PathBuf::from(&source_path);
    if !source.is_dir() {
        return Err("Source path must be a directory".into());
    }

    let pet_json = source.join("pet.json");
    if !pet_json.exists() {
        return Err("No pet.json found in source directory".into());
    }

    let content =
        fs::read_to_string(&pet_json).map_err(|e| format!("Failed to read pet.json: {}", e))?;
    let metadata: PetMetadata =
        serde_json::from_str(&content).map_err(|e| format!("Invalid pet.json: {}", e))?;

    let app_data = get_app_data_path(&app)?;
    let dest_dir = app_data.join("pets").join(&metadata.id);
    ensure_dir(&dest_dir)?;

    // Copy all files from source to destination
    copy_dir_recursive(&source, &dest_dir)?;

    Ok(PetPackage {
        metadata,
        directory: dest_dir.to_string_lossy().to_string(),
        is_bundled: false,
    })
}

fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    ensure_dir(dst)?;

    let entries =
        fs::read_dir(src).map_err(|e| format!("Failed to read dir {:?}: {}", src, e))?;

    for entry in entries.flatten() {
        let src_path = entry.path();
        let file_name = entry.file_name();
        let dst_path = dst.join(&file_name);

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy {:?}: {}", src_path, e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn list_terminal_processes() -> Result<Vec<TerminalProcess>, String> {
    // On Windows, use tasklist to find terminal-related processes.
    // On other platforms, use ps.
    let output = if cfg!(target_os = "windows") {
        std::process::Command::new("tasklist")
            .arg("/FO")
            .arg("CSV")
            .arg("/NH")
            .output()
    } else {
        std::process::Command::new("ps")
            .arg("-eo")
            .arg("pid,comm,args")
            .output()
    };

    let output = output.map_err(|e| format!("Failed to list processes: {}", e))?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    let terminal_names = [
        "cmd.exe",
        "powershell",
        "pwsh",
        "bash",
        "zsh",
        "fish",
        "wt.exe",
        "WindowsTerminal",
        "ConHost",
        "Terminal",
        "iTerm",
        "Alacritty",
        "Ghostty",
        "WezTerm",
        "node",
        "claude",
    ];

    let mut processes = Vec::new();

    if cfg!(target_os = "windows") {
        // Parse CSV output from tasklist
        for line in stdout.lines() {
            let fields: Vec<&str> = line.split(',').collect();
            if fields.len() >= 2 {
                let name = fields[0].trim_matches('"').to_string();
                let pid_str = fields[1].trim_matches('"');
                if let Ok(pid) = pid_str.parse::<u32>() {
                    if terminal_names
                        .iter()
                        .any(|t| name.to_lowercase().contains(&t.to_lowercase()))
                    {
                        processes.push(TerminalProcess {
                            pid,
                            name: name.clone(),
                            command: name,
                        });
                    }
                }
            }
        }
    } else {
        // Parse ps output
        for line in stdout.lines().skip(1) {
            let parts: Vec<&str> = line.trim().splitn(3, char::is_whitespace).collect();
            if parts.len() >= 2 {
                if let Ok(pid) = parts[0].parse::<u32>() {
                    let name = parts[1].to_string();
                    let cmd = if parts.len() >= 3 {
                        parts[2].to_string()
                    } else {
                        name.clone()
                    };
                    if terminal_names
                        .iter()
                        .any(|t| name.to_lowercase().contains(&t.to_lowercase()))
                    {
                        processes.push(TerminalProcess {
                            pid,
                            name,
                            command: cmd,
                        });
                    }
                }
            }
        }
    }

    Ok(processes)
}

#[tauri::command]
pub fn open_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window
            .show()
            .map_err(|e| format!("Failed to show settings window: {}", e))?;
        window
            .set_focus()
            .map_err(|e| format!("Failed to focus settings window: {}", e))?;
    } else {
        return Err("Settings window not found".into());
    }
    Ok(())
}

#[tauri::command]
pub fn close_settings_window(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window
            .hide()
            .map_err(|e| format!("Failed to hide settings window: {}", e))?;
    }
    Ok(())
}
