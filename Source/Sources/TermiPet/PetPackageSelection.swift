import TermiPetCore
import Foundation

@MainActor
final class PetPackageSelection: ObservableObject {
    @Published private(set) var package: PetPackage?
    @Published private(set) var errorMessage: String?
    @Published private(set) var importedPackages: [PetPackage] = []

    private let store: PetPackageStore

    init(store: PetPackageStore = PetPackageStore()) {
        self.store = store
        package = store.loadDefaultPackage()
        importedPackages = store.availablePackages()
    }

    func select(folderURL: URL) {
        guard let package = store.loadPackage(from: folderURL) else {
            errorMessage = "这个文件夹需要包含 pet.json 和对应的 spritesheet 文件。"
            return
        }

        do {
            try store.saveSelectedPackageFolderURL(folderURL)
            self.package = package
            errorMessage = nil
        } catch {
            errorMessage = "无法保存这个宠物选择。"
        }
    }

    func importAndSelect(folderURL: URL) {
        do {
            let imported = try store.importPackage(from: folderURL)
            package = imported
            importedPackages = store.availablePackages()
            errorMessage = nil
        } catch {
            errorMessage = "这个文件夹需要包含 pet.json 和对应的 spritesheet 文件。"
        }
    }

    func select(package: PetPackage) {
        do {
            try store.saveSelectedPackageFolderURL(package.folderURL)
            self.package = package
            errorMessage = nil
        } catch {
            errorMessage = "无法保存这个宠物选择。"
        }
    }

    func selectRandomImportedPackage(
        chooser: ([PetPackage]) -> PetPackage? = { packages in packages.randomElement() }
    ) {
        let currentURL = package?.folderURL.standardizedFileURL
        var candidates = importedPackages
        if candidates.count > 1, let currentURL {
            candidates = candidates.filter { $0.folderURL.standardizedFileURL != currentURL }
        }

        guard let selected = chooser(candidates) else {
            errorMessage = importedPackages.isEmpty ? "还没有导入宠物。" : nil
            return
        }

        select(package: selected)
    }

    func deleteImportedPackage(_ package: PetPackage) {
        do {
            let fallback = try store.deleteImportedPackage(at: package.folderURL)
            importedPackages = store.availablePackages()
            self.package = fallback ?? store.loadDefaultPackage()
            errorMessage = nil
        } catch PetPackageStoreError.cannotDeleteLastPackage {
            errorMessage = "至少需要保留一个宠物。"
        } catch PetPackageStoreError.cannotDeleteBuiltIn {
            errorMessage = "内置宠物不能删除。"
        } catch {
            errorMessage = "无法删除这个宠物。"
        }
    }
}
