import AppKit
import SwiftUI

/// NSHostingView 子类：在 panel content view 这一层做 NSTrackingArea，
/// 避开 SwiftUI .onHover 在动画 / NSViewRepresentable 子视图下的不稳定行为。
final class TrackingHostingView<Content: View>: NSHostingView<Content> {
    var onHoverChange: (@MainActor (Bool) -> Void)?

    private var hoverTrackingArea: NSTrackingArea?

    required init(rootView: Content) {
        super.init(rootView: rootView)
        wantsLayer = true
    }

    @available(*, unavailable)
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        if let hoverTrackingArea {
            removeTrackingArea(hoverTrackingArea)
        }
        // 不用 .assumeInside —— 它会在每次 update 时发假的 mouseEntered，引起闪烁
        let options: NSTrackingArea.Options = [.mouseEnteredAndExited, .mouseMoved, .activeAlways, .inVisibleRect]
        let area = NSTrackingArea(rect: .zero, options: options, owner: self, userInfo: nil)
        addTrackingArea(area)
        hoverTrackingArea = area
    }

    override func mouseEntered(with event: NSEvent) {
        super.mouseEntered(with: event)
        onHoverChange?(true)
    }

    override func mouseExited(with event: NSEvent) {
        super.mouseExited(with: event)
        onHoverChange?(false)
    }

    override func mouseMoved(with event: NSEvent) {
        super.mouseMoved(with: event)
        onHoverChange?(true)
    }
}
