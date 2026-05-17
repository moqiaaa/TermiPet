import TermiPetCore
import Foundation

@MainActor
final class AppSkinObservableStore: ObservableObject {
    @Published var skin: AppSkin {
        didSet {
            store.save(skin)
        }
    }

    private let store: AppSkinStore

    init(store: AppSkinStore = AppSkinStore()) {
        self.store = store
        self.skin = store.load()
    }
}
