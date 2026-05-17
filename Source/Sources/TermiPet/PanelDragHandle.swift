import AppKit
import SwiftUI

struct PanelDragHandle: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        DragView()
    }

    func updateNSView(_ nsView: NSView, context: Context) {}

    private final class DragView: NSView {
        override var mouseDownCanMoveWindow: Bool { false }

        override func hitTest(_ point: NSPoint) -> NSView? {
            guard bounds.contains(point), shouldHandleCurrentMouseDown else {
                return nil
            }
            return self
        }

        override func mouseDown(with event: NSEvent) {
            window?.performDrag(with: event)
        }

        private var shouldHandleCurrentMouseDown: Bool {
            guard let event = window?.currentEvent else { return false }
            return event.type == .leftMouseDown && !event.modifierFlags.contains(.control)
        }
    }
}
