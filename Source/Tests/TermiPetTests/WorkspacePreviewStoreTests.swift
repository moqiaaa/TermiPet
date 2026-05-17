import XCTest
@testable import TermiPet
@testable import TermiPetCore

@MainActor
final class WorkspacePreviewStoreTests: XCTestCase {
    func testPreviewStoreKeepsNewestItemsFirstAndDropsExpiredItems() {
        let now = Date(timeIntervalSince1970: 1_000)
        let store = PreviewStore(now: { now })

        store.setSourceItems([
            WorkspacePreviewItem(
                id: "terminal:a",
                source: .terminal,
                status: .idle,
                title: "Terminal A",
                summary: "Idle",
                lastSeen: now.addingTimeInterval(-4)
            ),
            WorkspacePreviewItem(
                id: "terminal:b",
                source: .terminal,
                status: .running,
                title: "Terminal B",
                summary: "Running",
                lastSeen: now
            ),
        ], source: .terminal)

        store.pruneExpired(maxAge: 3)

        XCTAssertEqual(store.items.map(\.id), ["terminal:b"])
    }

    func testPreviewStoreMergesSourcesWithoutOverwritingOtherSourceItems() {
        let now = Date(timeIntervalSince1970: 2_000)
        let store = PreviewStore(now: { now })

        store.setSourceItems([
            WorkspacePreviewItem(id: "terminal:a", source: .terminal, status: .running, title: "Terminal", summary: "Running", lastSeen: now)
        ], source: .terminal)
        store.setSourceItems([
            WorkspacePreviewItem(id: "claude:one", source: .claude, status: .running, title: "Claude", summary: "Working", lastSeen: now)
        ], source: .claude)

        XCTAssertEqual(Set(store.items.map(\.id)), ["terminal:a", "claude:one"])
    }

    func testPreviewStorePublishesTerminalActivityAndCompletedClaudeItems() {
        let now = Date(timeIntervalSince1970: 3_000)
        let store = PreviewStore(now: { now })

        store.setSourceItems([
            WorkspacePreviewItem(id: "terminal:idle", source: .terminal, status: .idle, title: "Terminal", summary: "Idle", lastSeen: now),
            WorkspacePreviewItem(id: "terminal:running", source: .terminal, status: .running, title: "Terminal", summary: "Running", lastSeen: now),
        ], source: .terminal)
        store.setSourceItems([
            WorkspacePreviewItem(id: "claude:done", source: .claude, status: .running, title: "Claude", summary: "Working", lastSeen: now.addingTimeInterval(-1)),
            WorkspacePreviewItem(id: "claude:working", source: .claude, status: .running, title: "Claude", summary: "Working", lastSeen: now),
        ], source: .claude)
        store.setSourceItems([
            WorkspacePreviewItem(id: "claude:done", source: .claude, status: .idle, title: "Claude", summary: "Done", lastSeen: now),
            WorkspacePreviewItem(id: "claude:working", source: .claude, status: .running, title: "Claude", summary: "Working", lastSeen: now),
        ], source: .claude)

        XCTAssertEqual(Set(store.items.map(\.id)), ["terminal:running", "claude:done", "claude:working"])
    }

    func testPreviewStoreKeepsCompletedClaudeItemUntilDismissed() {
        let now = Date(timeIntervalSince1970: 4_000)
        let store = PreviewStore(now: { now })

        store.setSourceItems([
            WorkspacePreviewItem(id: "claude:one", source: .claude, status: .running, title: "Claude", summary: "Working", lastSeen: now)
        ], source: .claude)
        XCTAssertEqual(store.items.map(\.id), ["claude:one"])

        store.setSourceItems([
            WorkspacePreviewItem(id: "claude:one", source: .claude, status: .idle, title: "Claude", summary: "Done", lastSeen: now)
        ], source: .claude)

        XCTAssertEqual(store.items.map(\.id), ["claude:one"])

        store.dismiss(id: "claude:one")

        XCTAssertTrue(store.items.isEmpty)
    }

    func testPreviewStoreDropsIdleClaudeItemsButKeepsActiveClaudeItems() {
        let now = Date(timeIntervalSince1970: 5_000)
        let store = PreviewStore(now: { now })

        store.setSourceItems([
            WorkspacePreviewItem(id: "claude:running", source: .claude, status: .running, title: "Claude", summary: "Working", lastSeen: now),
            WorkspacePreviewItem(id: "claude:idle", source: .claude, status: .idle, title: "Claude", summary: "Done", lastSeen: now),
        ], source: .claude)

        XCTAssertEqual(store.items.map(\.id), ["claude:running"])
    }

    func testNewClaudeTurnReplacesCompletedPreviewForSameConversation() {
        let now = Date(timeIntervalSince1970: 6_000)
        let store = PreviewStore(now: { now })
        let id = "claude:window:com.mitchellh.ghostty:123:TermiPet - claude"

        store.setSourceItems([
            WorkspacePreviewItem(id: id, source: .claude, status: .running, title: "Claude", summary: "Working", lastSeen: now)
        ], source: .claude)
        store.setSourceItems([
            WorkspacePreviewItem(id: id, source: .claude, status: .idle, title: "Claude", summary: "First answer", lastSeen: now.addingTimeInterval(1))
        ], source: .claude)
        store.setSourceItems([
            WorkspacePreviewItem(id: id, source: .claude, status: .running, title: "Claude", summary: "Second question", lastSeen: now.addingTimeInterval(2))
        ], source: .claude)

        XCTAssertEqual(store.items.map(\.id), [id])
        XCTAssertEqual(store.items.first?.summary, "Second question")
    }

    func testDismissedRunningItemDoesNotReappearUntilItFinishes() {
        var now = Date(timeIntervalSince1970: 7_000)
        let store = PreviewStore(now: { now })
        let id = "terminal:running"

        store.setSourceItems([
            WorkspacePreviewItem(id: id, source: .terminal, status: .running, title: "Terminal", summary: "Running", lastSeen: now)
        ], source: .terminal)
        store.dismiss(id: id)

        now = now.addingTimeInterval(1)
        store.setSourceItems([
            WorkspacePreviewItem(id: id, source: .terminal, status: .running, title: "Terminal", summary: "Still running", lastSeen: now)
        ], source: .terminal)

        XCTAssertTrue(store.items.isEmpty)

        now = now.addingTimeInterval(1)
        store.setSourceItems([
            WorkspacePreviewItem(id: id, source: .terminal, status: .idle, title: "Terminal", summary: "Done", lastSeen: now)
        ], source: .terminal)

        XCTAssertTrue(store.items.isEmpty)

        now = now.addingTimeInterval(1)
        store.setSourceItems([
            WorkspacePreviewItem(id: id, source: .terminal, status: .running, title: "Terminal", summary: "Running again", lastSeen: now)
        ], source: .terminal)

        XCTAssertEqual(store.items.map(\.id), [id])
        XCTAssertEqual(store.items.first?.summary, "Running again")
    }
}
