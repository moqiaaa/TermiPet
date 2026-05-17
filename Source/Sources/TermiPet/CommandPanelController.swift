import AppKit
import TermiPetCore
import SwiftUI

@MainActor
final class CommandPanelController: NSObject, NSWindowDelegate {
    private var panel: CommandPanelWindow?
    private var hostingView: NSHostingView<AnyView>?
    private var hasUserMovedPanel = false
    private var isSettingFrame = false
    private var localizer = AppLocalizer()

    var isVisible: Bool {
        panel?.isVisible == true
    }

    func configure(
        commands: [FloatingCommand],
        isPinned: Bool,
        onTogglePinned: @escaping @MainActor () -> Void,
        onAddCommandRequested: @escaping @MainActor () -> Void,
        onDeleteCommand: @escaping @MainActor (FloatingCommand) -> Void,
        onMoveCommand: @escaping @MainActor (FloatingCommand.ID, MoveDirection) -> Void,
        onCommandSelected: @escaping @MainActor (FloatingCommand) -> Void,
        onHoverChanged: @escaping @MainActor (Bool) -> Void,
        localizer: AppLocalizer = AppLocalizer(),
        skin: AppSkin = .glass
    ) {
        self.localizer = localizer
        let rootView = CommandPanelView(
            commands: commands,
            isPinned: isPinned,
            onTogglePinned: onTogglePinned,
            onAddCommandRequested: onAddCommandRequested,
            onDeleteCommand: onDeleteCommand,
            onMoveCommand: onMoveCommand,
            onCommandSelected: onCommandSelected,
            onResizeHeight: { [weak self] delta in
                self?.resizeHeight(by: delta)
            },
            localizer: localizer
        )
        .appSkin(skin)

        if let hostingView {
            hostingView.rootView = AnyView(rootView)
            if let trackingHostingView = hostingView as? TrackingHostingView<AnyView> {
                trackingHostingView.onHoverChange = onHoverChanged
            }
        } else {
            let hostingView = TrackingHostingView(rootView: AnyView(rootView))
            hostingView.wantsLayer = true
            hostingView.onHoverChange = onHoverChanged
            self.hostingView = hostingView
            ensurePanel(contentView: hostingView)
        }
    }

    func show(relativeTo petWindow: NSWindow?) {
        guard let panel else { return }
        if !hasUserMovedPanel, let petWindow {
            positionPanel(panel, relativeTo: petWindow)
        }
        panel.orderFrontRegardless()
    }

    func hide() {
        panel?.orderOut(nil)
    }

    func windowDidMove(_ notification: Notification) {
        guard !isSettingFrame else { return }
        hasUserMovedPanel = true
    }

    func windowWillResize(_ sender: NSWindow, to frameSize: NSSize) -> NSSize {
        NSSize(width: 360, height: min(max(frameSize.height, 260), 720))
    }

    private func resizeHeight(by delta: CGFloat) {
        guard let panel else { return }
        var frame = panel.frame
        let oldHeight = frame.height
        let newHeight = min(max(oldHeight - delta, 260), 720)
        frame.origin.y += oldHeight - newHeight
        frame.size.height = newHeight
        panel.setFrame(frame, display: true)
    }

    private func ensurePanel(contentView: NSView) {
        guard panel == nil else { return }

        let panel = CommandPanelWindow(
            contentRect: NSRect(x: 0, y: 0, width: 360, height: 420),
            styleMask: [.borderless, .nonactivatingPanel, .resizable],
            backing: .buffered,
            defer: false
        )
        panel.isFloatingPanel = true
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .stationary]
        panel.backgroundColor = .clear
        panel.isOpaque = false
        panel.hasShadow = false
        panel.hidesOnDeactivate = false
        panel.isMovable = true
        panel.isMovableByWindowBackground = true
        panel.minSize = NSSize(width: 360, height: 260)
        panel.maxSize = NSSize(width: 360, height: 720)
        panel.contentView = contentView
        panel.delegate = self
        self.panel = panel
    }

    private func positionPanel(_ panel: NSPanel, relativeTo petWindow: NSWindow) {
        let screenFrame = petWindow.screen?.frame ?? NSScreen.main?.frame ?? .zero
        guard screenFrame != .zero else { return }

        let petFrame = petWindow.frame
        let panelSize = panel.frame.size
        var origin = NSPoint(
            x: petFrame.maxX + 12,
            y: petFrame.midY - panelSize.height / 2
        )

        if origin.x + panelSize.width > screenFrame.maxX {
            origin.x = petFrame.minX - panelSize.width - 12
        }

        origin.x = min(max(origin.x, screenFrame.minX), screenFrame.maxX - panelSize.width)
        origin.y = min(max(origin.y, screenFrame.minY), screenFrame.maxY - panelSize.height)

        isSettingFrame = true
        panel.setFrameOrigin(origin)
        isSettingFrame = false
    }
}

private final class CommandPanelWindow: NSPanel {
    override var canBecomeKey: Bool { false }
    override var canBecomeMain: Bool { false }
}
