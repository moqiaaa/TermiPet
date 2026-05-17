import Foundation

enum StickyPreviewLayoutPolicy {
    static let maxHeight: CGFloat = 460
    static let visibleItemLimit = 4

    static func shouldUseScrollView(itemCount: Int, hasFallbackPreview: Bool) -> Bool {
        false
    }

    static func visibleItems<Item>(from items: [Item]) -> [Item] {
        Array(items.prefix(visibleItemLimit))
    }
}
