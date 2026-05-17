import Foundation

public struct PetMetadata: Decodable, Equatable, Sendable {
    public var id: String
    public var displayName: String
    public var description: String
    public var spritesheetPath: String

    public init(id: String, displayName: String, description: String, spritesheetPath: String) {
        self.id = id
        self.displayName = displayName
        self.description = description
        self.spritesheetPath = spritesheetPath
    }
}

public struct PetPackage: Equatable, Sendable {
    public var folderURL: URL
    public var metadata: PetMetadata
    public var isBuiltIn: Bool

    public init(folderURL: URL, metadata: PetMetadata, isBuiltIn: Bool = false) {
        self.folderURL = folderURL
        self.metadata = metadata
        self.isBuiltIn = isBuiltIn
    }

    public var spritesheetURL: URL {
        folderURL.appendingPathComponent(metadata.spritesheetPath)
    }

    public func localizedDisplayName(_ localizer: AppLocalizer) -> String {
        switch metadata.id {
        case "rainbow-pixel-cat":    return localizer.text(.petBuiltinPixelJituiName)
        case "rainbow-terminal-cat": return localizer.text(.petBuiltinTermicatName)
        case "mochi":                return localizer.text(.petBuiltinJituiName)
        case "wizard-claude":        return localizer.text(.petBuiltinWizardClaudeName)
        default:                     return metadata.displayName
        }
    }

    public func localizedDescription(_ localizer: AppLocalizer) -> String {
        switch metadata.id {
        case "rainbow-pixel-cat":    return localizer.text(.petBuiltinPixelJituiDesc)
        case "rainbow-terminal-cat": return localizer.text(.petBuiltinTermicatDesc)
        case "mochi":                return localizer.text(.petBuiltinJituiDesc)
        case "wizard-claude":        return localizer.text(.petBuiltinWizardClaudeDesc)
        default:                     return metadata.description + "\n" + localizer.text(.petFromPetdexCommunity)
        }
    }
}

public struct PetPackageStore {
    public let defaultFolderURLs: [URL]
    private let fileManager: FileManager
    private let supportURL: URL

    public init(
        defaultFolderURLs: [URL] = Self.defaultFolderURLs(),
        fileManager: FileManager = .default,
        applicationSupportURL: URL = Self.applicationSupportURL()
    ) {
        self.defaultFolderURLs = defaultFolderURLs
        self.fileManager = fileManager
        self.supportURL = applicationSupportURL
    }

    public func loadDefaultPackage() -> PetPackage? {
        if let selectedURL = selectedPackageFolderURL() {
            if let builtIn = builtInPackages().first(where: { $0.folderURL.standardizedFileURL == selectedURL.standardizedFileURL }) {
                return builtIn
            }
            if let package = loadPackage(from: selectedURL) {
                return package
            }
        }

        if let rainbow = builtInPackages().first(where: { $0.metadata.id == Self.defaultBuiltInPetId }) {
            return rainbow
        }

        if let imported = importedPackages().first {
            return imported
        }

        if let firstBuiltIn = builtInPackages().first {
            return firstBuiltIn
        }

        for folderURL in defaultFolderURLs {
            if let package = loadPackage(from: folderURL) {
                return package
            }
        }

        return nil
    }

    public static let defaultBuiltInPetId = "rainbow-pixel-cat"
    public static let builtInPetIds: [String] = ["rainbow-pixel-cat", "rainbow-terminal-cat", "wizard-claude", "mochi"]

    public func builtInPackages() -> [PetPackage] {
        Self.builtInPetIds.compactMap { id in
            guard let resourceURL = Bundle.main.resourceURL else { return nil }
            let folderURL = resourceURL.appendingPathComponent("Pets/\(id)", isDirectory: true)
            guard var pkg = loadPackage(from: folderURL) else { return nil }
            pkg.isBuiltIn = true
            return pkg
        }
    }

    public func availablePackages() -> [PetPackage] {
        let builtIns = builtInPackages()
        let builtInPaths = Set(builtIns.map { $0.folderURL.standardizedFileURL.path })
        let imported = importedPackages().filter { !builtInPaths.contains($0.folderURL.standardizedFileURL.path) }
        return builtIns + imported
    }

    public func loadPackage(from folderURL: URL) -> PetPackage? {
        let metadataURL = folderURL.appendingPathComponent("pet.json")
        guard let data = try? Data(contentsOf: metadataURL),
              let metadata = try? JSONDecoder().decode(PetMetadata.self, from: data),
              fileManager.fileExists(atPath: folderURL.appendingPathComponent(metadata.spritesheetPath).path) else {
            return nil
        }

        return PetPackage(folderURL: folderURL, metadata: metadata)
    }

    public func saveSelectedPackageFolderURL(_ folderURL: URL) throws {
        let data = try JSONEncoder().encode(folderURL.path)
        try fileManager.createDirectory(at: supportURL, withIntermediateDirectories: true)
        try data.write(to: selectedPackageURL(), options: .atomic)
    }

    public func selectedPackageFolderURL() -> URL? {
        guard let data = try? Data(contentsOf: selectedPackageURL()),
              let path = try? JSONDecoder().decode(String.self, from: data),
              !path.isEmpty else {
            return nil
        }

        return URL(fileURLWithPath: path)
    }

    public func importPackage(from sourceFolderURL: URL) throws -> PetPackage {
        guard let package = loadPackage(from: sourceFolderURL) else {
            throw PetPackageStoreError.invalidPackage
        }

        try fileManager.createDirectory(at: importedPetsURL(), withIntermediateDirectories: true)
        let destination = uniqueImportedFolderURL(for: package.metadata, sourceFolderURL: sourceFolderURL)
        try fileManager.copyItem(at: sourceFolderURL, to: destination)

        guard let imported = loadPackage(from: destination) else {
            throw PetPackageStoreError.invalidPackage
        }
        try saveSelectedPackageFolderURL(destination)
        return imported
    }

    public func importedPackages() -> [PetPackage] {
        guard let urls = try? fileManager.contentsOfDirectory(
            at: importedPetsURL(),
            includingPropertiesForKeys: [.isDirectoryKey],
            options: [.skipsHiddenFiles]
        ) else {
            return []
        }

        return urls
            .compactMap { loadPackage(from: $0) }
            .sorted {
                $0.metadata.displayName.localizedCaseInsensitiveCompare($1.metadata.displayName) == .orderedAscending
            }
    }

    public func deleteImportedPackage(at folderURL: URL) throws -> PetPackage? {
        let all = availablePackages()
        let standardURL = folderURL.standardizedFileURL
        if let match = all.first(where: { $0.folderURL.standardizedFileURL == standardURL }), match.isBuiltIn {
            throw PetPackageStoreError.cannotDeleteBuiltIn
        }
        guard all.count > 1 else {
            throw PetPackageStoreError.cannotDeleteLastPackage
        }
        let imported = importedPackages()
        guard let package = imported.first(where: { $0.folderURL.standardizedFileURL == standardURL }),
              package.folderURL.standardizedFileURL.path.hasPrefix(importedPetsURL().standardizedFileURL.path + "/") else {
            throw PetPackageStoreError.invalidPackage
        }

        try fileManager.removeItem(at: package.folderURL)

        let remainingImported = importedPackages()
        let selectedURL = selectedPackageFolderURL()?.standardizedFileURL
        let fallback: PetPackage?
        if selectedURL == package.folderURL.standardizedFileURL {
            fallback = remainingImported.first
                ?? builtInPackages().first(where: { $0.metadata.id == Self.defaultBuiltInPetId })
                ?? builtInPackages().first
            if let fallback {
                try saveSelectedPackageFolderURL(fallback.folderURL)
            }
        } else {
            fallback = loadDefaultPackage()
        }

        return fallback
    }

    public static func defaultFolderURLs() -> [URL] {
        var urls: [URL] = []

        if let resourceURL = Bundle.main.resourceURL {
            urls.append(resourceURL.appendingPathComponent("Pets/trumpet"))
        }

        urls.append(URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("Pets/trumpet"))
        urls.append(URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Desktop/TermiPetPlugin/Pets/trumpet"))
        urls.append(URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Desktop/trumpet"))

        return urls
    }

    public static func applicationSupportURL() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support")
        return base.appendingPathComponent("TermiPet", isDirectory: true)
    }

    private func selectedPackageURL() -> URL {
        supportURL.appendingPathComponent("selected-pet.json")
    }

    private func importedPetsURL() -> URL {
        supportURL.appendingPathComponent("ImportedPets", isDirectory: true)
    }

    private func uniqueImportedFolderURL(for metadata: PetMetadata, sourceFolderURL: URL) -> URL {
        let baseName = sanitizedFolderName(metadata.id.isEmpty ? sourceFolderURL.lastPathComponent : metadata.id)
        var candidate = importedPetsURL().appendingPathComponent(baseName, isDirectory: true)
        var suffix = 2
        while fileManager.fileExists(atPath: candidate.path) {
            candidate = importedPetsURL().appendingPathComponent("\(baseName)-\(suffix)", isDirectory: true)
            suffix += 1
        }
        return candidate
    }

    private func sanitizedFolderName(_ value: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
        let scalars = value.unicodeScalars.map { allowed.contains($0) ? Character($0) : "-" }
        let result = String(scalars).trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        return result.isEmpty ? "pet" : result
    }
}

public enum PetPackageStoreError: Error, Equatable {
    case invalidPackage
    case cannotDeleteLastPackage
    case cannotDeleteBuiltIn
}

public struct PetFrameRect: Equatable, Sendable {
    public var x: Int
    public var y: Int
    public var width: Int
    public var height: Int

    public init(x: Int, y: Int, width: Int, height: Int) {
        self.x = x
        self.y = y
        self.width = width
        self.height = height
    }
}

public struct PetSpritesheetGrid: Equatable, Sendable {
    public var actionCount: Int
    public var framesPerAction: Int
    public var validFramesByAction: [Int: Int]
    public var frameWidth: Int
    public var frameHeight: Int

    public init(
        actionCount: Int,
        framesPerAction: Int,
        validFramesByAction: [Int: Int] = [:],
        frameWidth: Int,
        frameHeight: Int
    ) {
        self.actionCount = actionCount
        self.framesPerAction = framesPerAction
        self.validFramesByAction = validFramesByAction
        self.frameWidth = frameWidth
        self.frameHeight = frameHeight
    }

    public static func infer(pixelWidth: Int, pixelHeight: Int) -> PetSpritesheetGrid {
        let actionCount = 9
        let frameHeight = max(1, pixelHeight / actionCount)
        let preferredFrameCounts = [8, 6, 4, 12, 3, 2, 1]
        let framesPerAction = preferredFrameCounts.first(where: { pixelWidth % $0 == 0 }) ?? max(1, pixelWidth / frameHeight)
        let frameWidth = max(1, pixelWidth / framesPerAction)
        return PetSpritesheetGrid(
            actionCount: actionCount,
            framesPerAction: framesPerAction,
            validFramesByAction: [
                0: 6,
                1: 8,
                2: 8,
                3: 4,
                4: 5,
                5: 8,
                6: 6,
                7: 6,
                8: 6,
            ],
            frameWidth: frameWidth,
            frameHeight: frameHeight
        )
    }

    public func validFrameCount(forAction action: Int) -> Int {
        validFramesByAction[action] ?? framesPerAction
    }

    public func frameRect(action: Int, frame: Int) -> PetFrameRect {
        let safeAction = min(max(action, 0), actionCount - 1)
        let validFrameCount = validFrameCount(forAction: safeAction)
        let safeFrame = min(max(frame, 0), max(0, validFrameCount - 1))
        return PetFrameRect(
            x: safeFrame * frameWidth,
            y: safeAction * frameHeight,
            width: frameWidth,
            height: frameHeight
        )
    }
}
