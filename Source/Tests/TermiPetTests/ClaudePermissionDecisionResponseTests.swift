import XCTest
@testable import TermiPetCore

final class ClaudePermissionDecisionResponseTests: XCTestCase {
    func testAllowDecisionUsesPermissionRequestHookOutputShape() throws {
        let data = try ClaudePermissionDecisionResponse.encode(.allow)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let output = try XCTUnwrap(object["hookSpecificOutput"] as? [String: Any])
        let decision = try XCTUnwrap(output["decision"] as? [String: Any])

        XCTAssertEqual(output["hookEventName"] as? String, "PermissionRequest")
        XCTAssertEqual(decision["behavior"] as? String, "allow")
    }

    func testDenyDecisionIncludesMessage() throws {
        let data = try ClaudePermissionDecisionResponse.encode(.deny)
        let object = try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
        let output = try XCTUnwrap(object["hookSpecificOutput"] as? [String: Any])
        let decision = try XCTUnwrap(output["decision"] as? [String: Any])

        XCTAssertEqual(decision["behavior"] as? String, "deny")
        XCTAssertEqual(decision["message"] as? String, "TermiPet denied this permission request.")
    }
}
