import XCTest
@testable import TermiPet

final class StickyPreviewLayoutPolicyTests: XCTestCase {
    func testVisibleItemLimitIsFour() {
        XCTAssertEqual(StickyPreviewLayoutPolicy.visibleItemLimit, 4)
    }

    func testSmallPreviewListsFitContentInsteadOfScrolling() {
        XCTAssertFalse(StickyPreviewLayoutPolicy.shouldUseScrollView(itemCount: 0, hasFallbackPreview: true))
        XCTAssertFalse(StickyPreviewLayoutPolicy.shouldUseScrollView(itemCount: 1, hasFallbackPreview: false))
        XCTAssertFalse(StickyPreviewLayoutPolicy.shouldUseScrollView(itemCount: 2, hasFallbackPreview: false))
        XCTAssertFalse(StickyPreviewLayoutPolicy.shouldUseScrollView(itemCount: 4, hasFallbackPreview: false))
    }

    func testOverflowPreviewListsDoNotUseScrolling() {
        XCTAssertFalse(StickyPreviewLayoutPolicy.shouldUseScrollView(itemCount: 5, hasFallbackPreview: false))
    }

    func testVisibleItemsKeepNewestFour() {
        let items = ["newest", "second", "third", "fourth", "oldest"]

        XCTAssertEqual(StickyPreviewLayoutPolicy.visibleItems(from: items), ["newest", "second", "third", "fourth"])
    }
}
