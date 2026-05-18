use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconEvent,
    AppHandle, Emitter, Manager,
};

/// Build and attach the system tray with menu items.
pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_hide = MenuItem::with_id(app, "show_hide", "Show/Hide Pet", true, None::<&str>)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let about = MenuItem::with_id(app, "about", "About TermiPet", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&show_hide, &settings, &separator, &about, &quit])?;

    // Tauri v2 auto-creates a tray from tauri.conf.json with a default ID.
    // Try to find it and set our menu on it. If not found, create a new one.
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu))?;
        tray.on_menu_event(handle_menu_event);
        tray.on_tray_icon_event(handle_tray_icon_event);
    } else {
        // Build a new tray icon if the config-based one isn't available
        let _tray_icon = tauri::tray::TrayIconBuilder::with_id("main")
            .tooltip("TermiPet")
            .menu(&menu)
            .on_menu_event(handle_menu_event)
            .on_tray_icon_event(handle_tray_icon_event)
            .build(app)?;
    }

    Ok(())
}

fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "show_hide" => {
            if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        }
        "settings" => {
            if let Some(window) = app.get_webview_window("settings") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "about" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
            let _ = app.emit("show-about", ());
        }
        "quit" => {
            app.exit(0);
        }
        _ => {}
    }
}

fn handle_tray_icon_event(tray: &tauri::tray::TrayIcon, event: TrayIconEvent) {
    if let TrayIconEvent::DoubleClick { .. } = event {
        let app = tray.app_handle();
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}
