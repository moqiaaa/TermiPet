import XCTest
@testable import TermiPet

@MainActor
final class ClaudeHookInstallerTests: XCTestCase {
    func testHookScriptReturnsPermissionRequestResponseToClaude() {
        let script = ClaudeHookInstaller.hookScriptContent

        XCTAssertTrue(script.contains("if [[ \"$EVENT_NAME\" == \"PermissionRequest\" ]]"))
        XCTAssertTrue(script.contains("--max-time 30"))
        XCTAssertTrue(script.contains("printf \"%s\" \"$RESPONSE\""))
        XCTAssertTrue(script.range(of: "--max-time 30 2>/dev/null") != nil)
        XCTAssertNil(script.range(of: "--max-time 30 >/dev/null"))
    }
}
