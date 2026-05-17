import AppKit
import SwiftUI

struct HoverTrackingArea: NSViewRepresentable {
    let onHoverChanged: @MainActor (Bool) -> Void

    func makeNSView(context: Context) -> NSView {
        let view = TrackingView()
        view.onHoverChanged = onHoverChanged
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        guard let view = nsView as? TrackingView else { return }
        view.onHoverChanged = onHoverChanged
    }

    private final class TrackingView: NSView {
        var onHoverChanged: (@MainActor (Bool) -> Void)?
        private var trackingArea: NSTrackingArea?
        private var isInside = false

        override func updateTrackingAreas() {
            super.updateTrackingAreas()
            if let trackingArea {
                removeTrackingArea(trackingArea)
            }

            let options: NSTrackingArea.Options = [.mouseEnteredAndExited, .mouseMoved, .activeAlways, .inVisibleRect]
            let area = NSTrackingArea(rect: .zero, options: options, owner: self, userInfo: nil)
            addTrackingArea(area)
            trackingArea = area
        }

        override func hitTest(_ point: NSPoint) -> NSView? {
            nil
        }

        override func mouseEntered(with event: NSEvent) {
            super.mouseEntered(with: event)
            updateHover(true)
        }

        override func mouseExited(with event: NSEvent) {
            super.mouseExited(with: event)
            updateHover(false)
        }

        override func mouseMoved(with event: NSEvent) {
            super.mouseMoved(with: event)
            updateHover(true)
        }

        private func updateHover(_ hovering: Bool) {
            guard hovering != isInside else { return }
            isInside = hovering
            onHoverChanged?(hovering)
        }
    }
}

extension View {
    func hoverTrackingArea(_ onHoverChanged: @escaping @MainActor (Bool) -> Void) -> some View {
        overlay {
            HoverTrackingArea(onHoverChanged: onHoverChanged)
        }
    }
}
