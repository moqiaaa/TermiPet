import XCTest
@testable import TermiPet
import TermiPetCore

@MainActor
final class UsageQuotaStoreTests: XCTestCase {
    func testRefreshIfStaleUsesFiveMinuteCache() async {
        let claudeCalls = CallCounter()
        let codexCalls = CallCounter()
        let copilotCalls = CallCounter()
        let store = UsageQuotaStore(
            cacheTTL: 300,
            now: { Date(timeIntervalSince1970: 1_000) },
            fetchClaude: {
                await claudeCalls.increment()
                return ServiceQuota(service: .claudeCode, status: .valid, tiers: [], fetchedAt: Date(timeIntervalSince1970: 1_000))
            },
            fetchCodex: {
                await codexCalls.increment()
                return ServiceQuota(service: .codex, status: .valid, tiers: [], fetchedAt: Date(timeIntervalSince1970: 1_000))
            },
            fetchCopilot: {
                await copilotCalls.increment()
                return ServiceQuota(service: .copilot, status: .valid, tiers: [], fetchedAt: Date(timeIntervalSince1970: 1_000))
            }
        )

        await store.refreshIfStale()
        await store.refreshIfStale()

        let claudeValue = await claudeCalls.value()
        let codexValue = await codexCalls.value()
        let copilotValue = await copilotCalls.value()

        XCTAssertEqual(claudeValue, 1)
        XCTAssertEqual(codexValue, 1)
        XCTAssertEqual(copilotValue, 1)
        XCTAssertEqual(store.quotas.count, 3)
    }

    func testForceRefreshBypassesCache() async {
        let calls = CallCounter()
        let store = UsageQuotaStore(
            cacheTTL: 300,
            now: { Date(timeIntervalSince1970: 1_000) },
            fetchClaude: {
                await calls.increment()
                return ServiceQuota(service: .claudeCode, status: .valid, tiers: [], fetchedAt: Date(timeIntervalSince1970: 1_000))
            },
            fetchCodex: {
                ServiceQuota(service: .codex, status: .notFound, tiers: [], fetchedAt: Date(timeIntervalSince1970: 1_000))
            },
            fetchCopilot: {
                ServiceQuota(service: .copilot, status: .notFound, tiers: [], fetchedAt: Date(timeIntervalSince1970: 1_000))
            }
        )

        await store.refreshIfStale()
        await store.refreshIfStale(force: true)

        let value = await calls.value()
        XCTAssertEqual(value, 2)
    }
}

private actor CallCounter {
    private var count = 0

    func value() -> Int { count }

    func increment() {
        count += 1
    }
}
