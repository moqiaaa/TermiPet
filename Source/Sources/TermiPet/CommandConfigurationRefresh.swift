import Foundation

@MainActor
final class CommandConfigurationRefresh: ObservableObject {
    @Published private(set) var token = 0

    func refresh() {
        token += 1
    }
}
