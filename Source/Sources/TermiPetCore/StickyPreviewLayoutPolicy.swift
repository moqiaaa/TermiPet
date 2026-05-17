public enum StickyPreviewLayoutPolicy {
    public static let maxHeight: Double = 460
    public static let visibleItemLimit = 4

    public static func shouldUseScrollView(itemCount: Int, hasFallbackPreview: Bool) -> Bool {
        false
    }

    public static func visibleItems<Item>(from items: [Item]) -> [Item] {
        Array(items.prefix(visibleItemLimit))
    }
}
