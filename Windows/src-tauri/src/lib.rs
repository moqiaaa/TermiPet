mod commands;
mod hook_server;
mod tray;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::get_pet_packages,
            commands::get_pet_metadata,
            commands::save_settings,
            commands::load_settings,
            commands::get_default_commands,
            commands::send_chat_message,
            commands::get_app_data_dir,
            commands::import_pet_package,
            commands::list_terminal_processes,
            commands::open_settings_window,
            commands::close_settings_window,
            hook_server::get_hook_server_port,
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            // Set up the system tray
            if let Err(e) = tray::setup_tray(&handle) {
                eprintln!("Failed to set up system tray: {}", e);
            }

            // Start the hook server for Claude Code integration
            match hook_server::start_hook_server(handle.clone()) {
                Ok(port) => {
                    println!("TermiPet hook server started on port {}", port);
                }
                Err(e) => {
                    eprintln!("Failed to start hook server: {}", e);
                }
            }

            // Hide the settings window on startup (it starts hidden per config,
            // but ensure it stays hidden)
            if let Some(settings_window) = app.get_webview_window("settings") {
                let _ = settings_window.hide();
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running TermiPet");
}
