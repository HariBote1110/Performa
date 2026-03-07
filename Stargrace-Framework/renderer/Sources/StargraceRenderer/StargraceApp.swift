import Foundation
import SwiftUI
#if os(macOS)
import AppKit
#endif

struct RenderDocument: Codable, Sendable {
    let type: String
    let root: ComponentNode?
}

enum ComponentKind: String, Codable, Sendable {
    case vstack
    case hstack
    case list
    case scrollview
    case linechart
    case text
    case textfield
    case button
}

struct ComponentNode: Codable, Sendable {
    let kind: ComponentKind
    let id: String?
    let text: String?
    let placeholder: String?
    let value: String?
    let values: [Double]?
    let action: String?
    let spacing: Double?
    let children: [ComponentNode]?
}

struct EventMessage: Encodable, Sendable {
    let type: String
    let action: String
    let value: String?

    init(action: String, value: String? = nil) {
        self.type = "event"
        self.action = action
        self.value = value
    }
}

enum AppearanceMode: String, CaseIterable {
    case system
    case light
    case dark

    var title: String {
        switch self {
        case .system:
            return "システム"
        case .light:
            return "ライト"
        case .dark:
            return "ダーク"
        }
    }

    var colourScheme: ColorScheme? {
        switch self {
        case .system:
            return nil
        case .light:
            return .light
        case .dark:
            return .dark
        }
    }
}

enum RuntimeTransportMode: String {
    case auto
    case socket
    case embedded

    static func resolve(environment: [String: String]) -> RuntimeTransportMode {
        let rawValue = environment["STARGRACE_RUNTIME_MODE"]?
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .lowercased() ?? "auto"
        let configured = RuntimeTransportMode(rawValue: rawValue) ?? .auto
        if configured != .auto {
            return configured
        }

#if os(macOS)
        return .socket
#else
        return .embedded
#endif
    }

    var title: String {
        switch self {
        case .auto:
            return "auto"
        case .socket:
            return "socket"
        case .embedded:
            return "embedded"
        }
    }
}

extension ComponentNode {
    static func vstack(id: String? = nil, spacing: Double? = nil, children: [ComponentNode] = []) -> ComponentNode {
        ComponentNode(
            kind: .vstack,
            id: id,
            text: nil,
            placeholder: nil,
            value: nil,
            values: nil,
            action: nil,
            spacing: spacing,
            children: children
        )
    }

    static func hstack(id: String? = nil, spacing: Double? = nil, children: [ComponentNode] = []) -> ComponentNode {
        ComponentNode(
            kind: .hstack,
            id: id,
            text: nil,
            placeholder: nil,
            value: nil,
            values: nil,
            action: nil,
            spacing: spacing,
            children: children
        )
    }

    static func list(id: String? = nil, children: [ComponentNode] = []) -> ComponentNode {
        ComponentNode(
            kind: .list,
            id: id,
            text: nil,
            placeholder: nil,
            value: nil,
            values: nil,
            action: nil,
            spacing: nil,
            children: children
        )
    }

    static func scrollView(id: String? = nil, children: [ComponentNode] = []) -> ComponentNode {
        ComponentNode(
            kind: .scrollview,
            id: id,
            text: nil,
            placeholder: nil,
            value: nil,
            values: nil,
            action: nil,
            spacing: nil,
            children: children
        )
    }

    static func lineChart(id: String? = nil, values: [Double] = []) -> ComponentNode {
        ComponentNode(
            kind: .linechart,
            id: id,
            text: nil,
            placeholder: nil,
            value: nil,
            values: values,
            action: nil,
            spacing: nil,
            children: nil
        )
    }

    static func text(_ value: String, id: String? = nil) -> ComponentNode {
        ComponentNode(
            kind: .text,
            id: id,
            text: value,
            placeholder: nil,
            value: nil,
            values: nil,
            action: nil,
            spacing: nil,
            children: nil
        )
    }

    static func textField(
        id: String? = nil,
        placeholder: String? = nil,
        value: String? = nil,
        action: String? = nil
    ) -> ComponentNode {
        ComponentNode(
            kind: .textfield,
            id: id,
            text: nil,
            placeholder: placeholder,
            value: value,
            values: nil,
            action: action,
            spacing: nil,
            children: nil
        )
    }

    static func button(_ label: String, action: String? = nil, id: String? = nil) -> ComponentNode {
        ComponentNode(
            kind: .button,
            id: id,
            text: label,
            placeholder: nil,
            value: nil,
            values: nil,
            action: action,
            spacing: nil,
            children: nil
        )
    }
}

final class EmbeddedCounterController {
    private enum Action {
        static let increment = "increment"
        static let decrement = "decrement"
        static let reset = "reset"
        static let addNote = "add_note"
    }

    private let title: String
    private let encoder: PropertyListEncoder
    private var counter = 0
    private var notes = ["Stargrace Framework", "Phase 4"]
    private var eventLog: [String] = []
    private var onPayload: ((Data) -> Void)?

    init(title: String) {
        self.title = title.isEmpty ? "Stargrace Counter" : title
        let encoder = PropertyListEncoder()
        encoder.outputFormat = .binary
        self.encoder = encoder
    }

    func start(onPayload: @escaping (Data) -> Void) throws {
        self.onPayload = onPayload
        try emitRenderDocument()
    }

    func sendAction(_ action: String, value: String?) throws {
        guard applyAction(action: action, value: value) else {
            return
        }
        try emitRenderDocument()
    }

    private func applyAction(action: String, value: String?) -> Bool {
        let trimmedAction = action.trimmingCharacters(in: .whitespacesAndNewlines)
        switch trimmedAction {
        case Action.increment:
            counter += 1
            appendEventLog("+1 -> \(counter)")
            return true
        case Action.decrement:
            counter -= 1
            appendEventLog("-1 -> \(counter)")
            return true
        case Action.reset:
            counter = 0
            appendEventLog("reset -> 0")
            return true
        case Action.addNote:
            let note = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !note.isEmpty else {
                return false
            }
            notes.append(note)
            appendEventLog("note: \(note)")
            return true
        default:
            return false
        }
    }

    private func emitRenderDocument() throws {
        guard let onPayload else {
            return
        }

        let payload = try encoder.encode(buildDocument())
        onPayload(payload)
    }

    private func buildDocument() -> RenderDocument {
        RenderDocument(
            type: "render",
            root: .vstack(
                id: "root",
                spacing: 14,
                children: [
                    .text(title, id: "title"),
                    .hstack(
                        id: "counter_actions",
                        spacing: 12,
                        children: [
                            .text("Count: \(counter)", id: "count"),
                            .button("+1", action: Action.increment),
                            .button("-1", action: Action.decrement),
                            .button("Reset", action: Action.reset),
                        ]
                    ),
                    .textField(
                        id: "note_input",
                        placeholder: "メモを入力して Enter",
                        value: "",
                        action: Action.addNote
                    ),
                    .text("Notes", id: "notes_title"),
                    renderNotes(),
                    .text("Event Log", id: "event_title"),
                    renderEventLog(),
                ]
            )
        )
    }

    private func renderNotes() -> ComponentNode {
        let noteChildren = notes.isEmpty
            ? [ComponentNode.text("まだメモはありません")]
            : notes.map { ComponentNode.text($0) }
        return .list(id: "notes_list", children: noteChildren)
    }

    private func renderEventLog() -> ComponentNode {
        let entries = eventLog.isEmpty
            ? [ComponentNode.text("イベント待機中")]
            : eventLog.reversed().map { ComponentNode.text($0) }

        return .scrollView(
            id: "event_log",
            children: [
                .vstack(spacing: 6, children: entries),
            ]
        )
    }

    private func appendEventLog(_ entry: String) {
        eventLog.append(entry)
        let maxEventLogSize = 30
        if eventLog.count > maxEventLogSize {
            eventLog = Array(eventLog.suffix(maxEventLogSize))
        }
    }
}

private enum DecodedPayload: Sendable {
    case render(RenderDocument)
    case fallback(String?)
}

private enum RenderUpdateThrottle {
    static let defaultMaxFPS = 30
    static let maxAllowedFPS = 120

    static func resolveMaxFPS(environment: [String: String]) -> Int {
        guard let rawValue = environment["STARGRACE_RENDER_MAX_FPS"]?
            .trimmingCharacters(in: .whitespacesAndNewlines),
              !rawValue.isEmpty,
              let parsedValue = Int(rawValue) else {
            return defaultMaxFPS
        }

        return max(1, min(parsedValue, maxAllowedFPS))
    }
}

@MainActor
final class RendererRuntime: ObservableObject {
    @Published var socketPath: String
    @Published var eventSocketPath: String
    @Published var transportModeName: String
    @Published var statusMessage: String = "初期化中..."
    @Published var fallbackMessage: String?
    @Published var document: RenderDocument?
    @Published var lastAction: String?

    private let transportMode: RuntimeTransportMode
    private let server: UnixSocketServer?
    private let eventForwarder: EventForwarder?
    private let embeddedController: EmbeddedCounterController?
#if os(macOS)
    private let bootstrapper: ControllerBootstrapper?
#endif
    private let renderMaxFPS: Int
    private var hasStarted = false
    private var pendingPayload: Data?
    private var isPayloadFlushScheduled = false
    private var lastRenderApplyUptimeNanoseconds: UInt64 = 0
    private var hasReceivedRenderableDocument = false

    init() {
        let env = ProcessInfo.processInfo.environment
        let configuredSocketPath = env["STARGRACE_SOCKET_PATH"] ?? "/tmp/stargrace.sock"
        let configuredEventSocketPath = env["STARGRACE_EVENT_SOCKET_PATH"] ?? "/tmp/stargrace-events.sock"
        let launchMessage = env["STARGRACE_BOOTSTRAP_MESSAGE"] ?? "Stargrace Counter"
        let resolvedTransportMode = RuntimeTransportMode.resolve(environment: env)

        socketPath = configuredSocketPath
        eventSocketPath = configuredEventSocketPath
        transportMode = resolvedTransportMode
        transportModeName = resolvedTransportMode.title
        renderMaxFPS = RenderUpdateThrottle.resolveMaxFPS(environment: env)

        switch resolvedTransportMode {
        case .socket:
            server = UnixSocketServer(socketPath: configuredSocketPath)
            eventForwarder = EventForwarder(socketPath: configuredEventSocketPath)
            embeddedController = nil
#if os(macOS)
            bootstrapper = ControllerBootstrapper()
#endif
        case .embedded, .auto:
            server = nil
            eventForwarder = nil
            embeddedController = EmbeddedCounterController(title: launchMessage)
#if os(macOS)
            bootstrapper = nil
#endif
        }
    }

    func start() {
        guard !hasStarted else {
            return
        }
        hasStarted = true

        switch transportMode {
        case .socket:
            guard let server else {
                statusMessage = "socket backend の初期化に失敗しました"
                return
            }

            do {
                try server.start { [weak self] incomingPayload in
                    Task { @MainActor in
                        self?.enqueueIncomingPayload(incomingPayload)
                    }
                }
                statusMessage = "接続待機中(\(transportModeName)): \(socketPath)"
            } catch {
                statusMessage = "ソケット起動に失敗: \(error.localizedDescription)"
                return
            }

#if os(macOS)
            bootstrapper?.launchIfConfigured(socketPath: socketPath, eventSocketPath: eventSocketPath)
#endif

        case .embedded, .auto:
            guard let embeddedController else {
                statusMessage = "embedded backend の初期化に失敗しました"
                return
            }

            do {
                try embeddedController.start { [weak self] incomingPayload in
                    Task { @MainActor in
                        self?.enqueueIncomingPayload(incomingPayload)
                    }
                }
                statusMessage = "埋め込み Controller を起動しました"
            } catch {
                statusMessage = "埋め込み Controller の起動に失敗: \(error.localizedDescription)"
            }
        }
    }

    func handleAction(_ action: String?, value: String? = nil) {
        guard let action, !action.isEmpty else {
            lastAction = "Button タップ (action 未定義)"
            return
        }

        switch transportMode {
        case .socket:
            guard let eventForwarder else {
                lastAction = "イベント送信失敗: \(action)"
                statusMessage = "socket backend の初期化に失敗しました"
                return
            }

            do {
                try eventForwarder.sendAction(action, value: value)
                if let value, !value.isEmpty {
                    lastAction = "イベント送信: \(action) [\(value)]"
                } else {
                    lastAction = "イベント送信: \(action)"
                }
                statusMessage = "イベントを送信しました"
            } catch {
                lastAction = "イベント送信失敗: \(action)"
                statusMessage = "イベント送信に失敗: \(error.localizedDescription)"
            }

        case .embedded, .auto:
            guard let embeddedController else {
                lastAction = "イベント適用失敗: \(action)"
                statusMessage = "embedded backend の初期化に失敗しました"
                return
            }

            do {
                try embeddedController.sendAction(action, value: value)
                if let value, !value.isEmpty {
                    lastAction = "イベント適用: \(action) [\(value)]"
                } else {
                    lastAction = "イベント適用: \(action)"
                }
                statusMessage = "埋め込み Controller を更新しました"
            } catch {
                statusMessage = "イベント適用に失敗: \(error.localizedDescription)"
            }
        }
    }

    private func enqueueIncomingPayload(_ incomingPayload: Data) {
        pendingPayload = incomingPayload
        schedulePayloadFlushIfNeeded()
    }

    private func schedulePayloadFlushIfNeeded() {
        guard !isPayloadFlushScheduled else {
            return
        }
        isPayloadFlushScheduled = true

        let delayNanoseconds = computeFlushDelayNanoseconds()
        Task { [weak self] in
            if delayNanoseconds > 0 {
                try? await Task.sleep(nanoseconds: delayNanoseconds)
            }
            await self?.flushPendingPayload()
        }
    }

    private func computeFlushDelayNanoseconds() -> UInt64 {
        guard renderMaxFPS > 0 else {
            return 0
        }

        let renderIntervalNanoseconds = UInt64(1_000_000_000 / renderMaxFPS)
        let now = DispatchTime.now().uptimeNanoseconds
        let nextAvailableTime = lastRenderApplyUptimeNanoseconds &+ renderIntervalNanoseconds
        if now >= nextAvailableTime {
            return 0
        }
        return nextAvailableTime - now
    }

    private func flushPendingPayload() async {
        isPayloadFlushScheduled = false
        guard let incomingPayload = pendingPayload else {
            return
        }
        pendingPayload = nil

        let decodedPayload = await RendererRuntime.decodeIncomingPayload(incomingPayload)
        applyDecodedPayload(decodedPayload)

        if case .render = decodedPayload {
            lastRenderApplyUptimeNanoseconds = DispatchTime.now().uptimeNanoseconds
        }

        if pendingPayload != nil {
            schedulePayloadFlushIfNeeded()
        }
    }

    private func applyDecodedPayload(_ decodedPayload: DecodedPayload) {
        switch decodedPayload {
        case let .render(decodedDocument):
            document = decodedDocument
            fallbackMessage = nil
            if !hasReceivedRenderableDocument {
                statusMessage = "SDUI ドキュメントを受信しました"
                hasReceivedRenderableDocument = true
            }
        case let .fallback(textMessage):
            fallbackMessage = textMessage
            document = nil
            hasReceivedRenderableDocument = false
            if textMessage?.isEmpty == false {
                statusMessage = "プレーンテキストを受信しました"
            } else {
                statusMessage = "未対応フォーマットを受信しました"
            }
        }
    }

    nonisolated private static func decodeIncomingPayload(_ incomingPayload: Data) async -> DecodedPayload {
        await Task.detached(priority: .userInitiated) {
            let decoder = PropertyListDecoder()
            if let decodedDocument = try? decoder.decode(RenderDocument.self, from: incomingPayload),
               decodedDocument.type == "render",
               decodedDocument.root != nil {
                return DecodedPayload.render(decodedDocument)
            }

            let fallbackMessage = String(data: incomingPayload, encoding: .utf8)?
                .trimmingCharacters(in: .whitespacesAndNewlines)
            return DecodedPayload.fallback(fallbackMessage)
        }.value
    }
}

struct ContentView: View {
    @EnvironmentObject private var runtime: RendererRuntime
#if os(iOS)
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
#endif

    var body: some View {
        Group {
#if os(iOS)
            ScrollView {
                mainContent
                    .frame(maxWidth: .infinity, alignment: .topLeading)
            }
            .scrollDismissesKeyboard(.interactively)
#else
            mainContent
                .frame(minWidth: 640, minHeight: 420)
#endif
        }
        .onAppear {
#if os(macOS)
            NSApplication.shared.activate(ignoringOtherApps: true)
#endif
        }
    }

    private var mainContent: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Stargrace Renderer")
                .font(.system(size: 24, weight: .bold))
            Text("Transport: \(runtime.transportModeName)")
                .font(.system(size: 12, weight: .regular))
            if !isCompactLayout {
                Text("Render Socket: \(runtime.socketPath)")
                    .font(.system(size: 12, weight: .regular))
                    .lineLimit(1)
                    .truncationMode(.middle)
                Text("Event Socket: \(runtime.eventSocketPath)")
                    .font(.system(size: 12, weight: .regular))
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            Text(runtime.statusMessage)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(.secondary)
            if let lastAction = runtime.lastAction {
                Text(lastAction)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(.secondary)
            }
            Divider()

            Group {
                if let root = runtime.document?.root {
                    DynamicNodeView(node: root, onAction: runtime.handleAction)
                } else if let fallbackMessage = runtime.fallbackMessage {
                    Text(fallbackMessage)
                        .font(.system(size: 18, weight: .regular))
                } else {
                    Text("受信待機中...")
                        .font(.system(size: 18, weight: .regular))
                }
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
#if os(macOS)
            .frame(maxHeight: .infinity, alignment: .topLeading)
#endif
        }
        .padding(isCompactLayout ? 16 : 24)
    }

    private var isCompactLayout: Bool {
#if os(iOS)
        horizontalSizeClass == .compact
#else
        false
#endif
    }
}

struct DynamicNodeView: View {
    let node: ComponentNode
    let onAction: (String?, String?) -> Void
#if os(iOS)
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
#endif

    var body: some View {
        renderNode(node)
    }

    private func renderNode(_ node: ComponentNode) -> AnyView {
        switch node.kind {
        case .vstack:
            return AnyView(
                VStack(alignment: .leading, spacing: node.spacing ?? 8) {
                    renderChildren(node.children ?? [])
                }
            )
        case .hstack:
            let children = node.children ?? []
            if shouldUseVerticalFallback(for: children) {
                return AnyView(
                    VStack(alignment: .leading, spacing: node.spacing ?? 8) {
                        renderChildren(children)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                )
            }
            return AnyView(
                HStack(alignment: .center, spacing: node.spacing ?? 8) {
                    renderChildren(children)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            )
        case .list:
            let children = node.children ?? []
            let heights = listHeights
            return AnyView(
                List {
                    renderChildren(children)
                }
                .listStyle(.plain)
                .frame(minHeight: heights.min, maxHeight: heights.max)
            )
        case .scrollview:
            let children = node.children ?? []
            let heights = scrollViewHeights
            return AnyView(
                ScrollView {
                    VStack(alignment: .leading, spacing: node.spacing ?? 8) {
                        renderChildren(children)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(minHeight: heights.min, maxHeight: heights.max)
            )
        case .linechart:
            return AnyView(
                LineChartNodeView(values: node.values ?? [])
            )
        case .text:
            return AnyView(
                Text(node.text ?? "")
                    .font(.system(size: 16, weight: .regular))
                    .fixedSize(horizontal: false, vertical: true)
            )
        case .textfield:
            return AnyView(
                TextFieldNodeView(node: node, onAction: onAction)
            )
        case .button:
            if isCompactLayout {
                return AnyView(
                    Button(node.text ?? "Button") {
                        onAction(node.action, nil)
                    }
                    .buttonStyle(.bordered)
                )
            }
            return AnyView(
                Button(node.text ?? "Button") {
                    onAction(node.action, nil)
                }
                .buttonStyle(.borderedProminent)
            )
        }
    }

    @ViewBuilder
    private func renderChildren(_ children: [ComponentNode]) -> some View {
        ForEach(Array(children.enumerated()), id: \.offset) { _, child in
            DynamicNodeView(node: child, onAction: onAction)
        }
    }

    private var isCompactLayout: Bool {
#if os(iOS)
        horizontalSizeClass == .compact
#else
        false
#endif
    }

    private var listHeights: (min: CGFloat, max: CGFloat) {
        if isCompactLayout {
            return (112, 180)
        }
        return (140, 220)
    }

    private var scrollViewHeights: (min: CGFloat, max: CGFloat) {
        if isCompactLayout {
            return (100, 160)
        }
        return (120, 200)
    }

    private func shouldUseVerticalFallback(for children: [ComponentNode]) -> Bool {
        guard isCompactLayout else {
            return false
        }

        let buttonCount = children.filter { $0.kind == .button }.count
        return children.count >= 3 || buttonCount >= 2
    }
}

struct LineChartNodeView: View {
    let values: [Double]
#if os(iOS)
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
#endif

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            GeometryReader { proxy in
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.secondary.opacity(0.08))

                    gridPath(in: proxy.size)
                        .stroke(Color.secondary.opacity(0.2), lineWidth: 1)

                    if values.count > 1 {
                        areaPath(in: proxy.size)
                            .fill(
                                LinearGradient(
                                    colors: [Color.green.opacity(0.32), Color.green.opacity(0.03)],
                                    startPoint: .top,
                                    endPoint: .bottom
                                )
                            )

                        linePath(in: proxy.size)
                            .stroke(
                                Color.green,
                                style: StrokeStyle(
                                    lineWidth: 2.0,
                                    lineCap: .round,
                                    lineJoin: .round
                                )
                            )
                    } else if let onlyValue = values.first {
                        Circle()
                            .fill(Color.green)
                            .frame(width: 8, height: 8)
                            .position(point(at: 0, value: onlyValue, in: proxy.size))
                    } else {
                        Text("データ待機中")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(height: chartHeight)

            HStack {
                Text("0")
                Spacer()
                Text(values.isEmpty ? "--" : String(format: "%.0f", latestValue))
                Spacer()
                Text("100")
            }
            .font(.system(size: 11, weight: .regular))
            .foregroundStyle(.secondary)
        }
    }

    private var latestValue: Double {
        values.last ?? 0
    }

    private var chartHeight: CGFloat {
        isCompactLayout ? 150 : 220
    }

    private var isCompactLayout: Bool {
#if os(iOS)
        horizontalSizeClass == .compact
#else
        false
#endif
    }

    private func point(at index: Int, value: Double, in size: CGSize) -> CGPoint {
        let safeWidth = max(size.width, 1)
        let safeHeight = max(size.height, 1)
        let clampedValue = min(max(value, 0), 100)
        let normalisedValue = clampedValue / 100

        if values.count <= 1 {
            let y = (1 - CGFloat(normalisedValue)) * safeHeight
            return CGPoint(x: safeWidth / 2, y: y)
        }

        let denominator = max(values.count - 1, 1)
        let x = CGFloat(index) / CGFloat(denominator) * safeWidth
        let y = (1 - CGFloat(normalisedValue)) * safeHeight
        return CGPoint(x: x, y: y)
    }

    private func linePath(in size: CGSize) -> Path {
        var path = Path()
        guard values.count > 1 else {
            return path
        }

        for (index, value) in values.enumerated() {
            let point = point(at: index, value: value, in: size)
            if index == 0 {
                path.move(to: point)
            } else {
                path.addLine(to: point)
            }
        }
        return path
    }

    private func areaPath(in size: CGSize) -> Path {
        var path = linePath(in: size)
        guard let lastIndex = values.indices.last else {
            return path
        }

        path.addLine(to: CGPoint(x: point(at: lastIndex, value: values[lastIndex], in: size).x, y: size.height))
        path.addLine(to: CGPoint(x: 0, y: size.height))
        path.closeSubpath()
        return path
    }

    private func gridPath(in size: CGSize) -> Path {
        var path = Path()
        let horizontalLines = 4
        let verticalLines = 5

        for step in 0...horizontalLines {
            let y = size.height * CGFloat(step) / CGFloat(horizontalLines)
            path.move(to: CGPoint(x: 0, y: y))
            path.addLine(to: CGPoint(x: size.width, y: y))
        }

        for step in 0...verticalLines {
            let x = size.width * CGFloat(step) / CGFloat(verticalLines)
            path.move(to: CGPoint(x: x, y: 0))
            path.addLine(to: CGPoint(x: x, y: size.height))
        }

        return path
    }
}

struct TextFieldNodeView: View {
    let node: ComponentNode
    let onAction: (String?, String?) -> Void

    @State private var text: String

    init(node: ComponentNode, onAction: @escaping (String?, String?) -> Void) {
        self.node = node
        self.onAction = onAction
        _text = State(initialValue: node.value ?? "")
    }

    var body: some View {
        TextField(node.placeholder ?? "", text: $text)
            .textFieldStyle(.roundedBorder)
#if os(iOS)
            .submitLabel(.done)
#endif
            .onSubmit {
                onAction(node.action, text)
                text = ""
            }
    }
}

#if os(macOS)
final class AppLifecycleDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        let app = NSApplication.shared
        _ = app.setActivationPolicy(.regular)

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            app.activate(ignoringOtherApps: true)
            for window in app.windows {
                window.collectionBehavior.insert(.moveToActiveSpace)
                window.center()
                window.makeKeyAndOrderFront(nil)
                window.orderFrontRegardless()
            }
        }
    }
}
#endif

@main
struct StargraceRendererApp: App {
#if os(macOS)
    @NSApplicationDelegateAdaptor(AppLifecycleDelegate.self) private var appDelegate
#endif
    @StateObject private var runtime = RendererRuntime()
    @AppStorage("stargrace.appearance_mode") private var appearanceModeRawValue = AppearanceMode.system.rawValue

    private var appearanceMode: AppearanceMode {
        get {
            AppearanceMode(rawValue: appearanceModeRawValue) ?? .system
        }
        set {
            appearanceModeRawValue = newValue.rawValue
        }
    }

    init() {
#if os(macOS)
        _ = NSApplication.shared.setActivationPolicy(.regular)
#endif
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(runtime)
                .preferredColorScheme(appearanceMode.colourScheme)
                .task {
                    runtime.start()
                }
        }
#if os(macOS)
        .commands {
            CommandMenu("Stargrace") {
                Button("+1") {
                    runtime.handleAction("increment")
                }
                .keyboardShortcut("=", modifiers: [.command])

                Button("-1") {
                    runtime.handleAction("decrement")
                }
                .keyboardShortcut("-", modifiers: [.command])

                Button("Reset") {
                    runtime.handleAction("reset")
                }
                .keyboardShortcut("0", modifiers: [.command])

                Divider()

                Picker("外観", selection: $appearanceModeRawValue) {
                    ForEach(AppearanceMode.allCases, id: \.rawValue) { mode in
                        Text(mode.title).tag(mode.rawValue)
                    }
                }
            }
        }
#endif
    }
}

#if os(macOS)
final class ControllerBootstrapper {
    private var process: Process?

    func launchIfConfigured(socketPath: String, eventSocketPath: String) {
        let env = ProcessInfo.processInfo.environment
        guard let executablePath = resolveControllerPath(environment: env) else {
            NSLog("Controller を検出できなかったため起動を省略します")
            return
        }

        let launchMessage = env["STARGRACE_BOOTSTRAP_MESSAGE"] ?? "Stargrace Counter"
        let launchMode = env["STARGRACE_BOOTSTRAP_MODE"] ?? "counter"

        let process = Process()
        process.executableURL = URL(fileURLWithPath: executablePath)
        process.arguments = [
            "--socket", socketPath,
            "--event-socket", eventSocketPath,
            "--message", launchMessage,
            "--mode", launchMode,
        ]

        let stdioPipe = Pipe()
        process.standardOutput = stdioPipe
        process.standardError = stdioPipe

        do {
            try process.run()
            self.process = process
            consumeLogs(from: stdioPipe.fileHandleForReading)
        } catch {
            NSLog("Controller の起動に失敗しました: %@", error.localizedDescription)
        }
    }

    private func consumeLogs(from fileHandle: FileHandle) {
        fileHandle.readabilityHandler = { handle in
            let data = handle.availableData
            guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else {
                return
            }
            NSLog("%@", text.trimmingCharacters(in: .newlines))
        }
    }

    private func resolveControllerPath(environment: [String: String]) -> String? {
        if let configuredPath = environment["STARGRACE_CONTROLLER_PATH"], !configuredPath.isEmpty {
            return configuredPath
        }

        if let executablePath = Bundle.main.executablePath {
            let siblingControllerPath = URL(fileURLWithPath: executablePath)
                .deletingLastPathComponent()
                .appendingPathComponent("stargrace-controller")
                .path
            if FileManager.default.isExecutableFile(atPath: siblingControllerPath) {
                return siblingControllerPath
            }
        }

        return nil
    }

    func stop() {
        guard let process else {
            return
        }

        if process.isRunning {
            process.terminate()
        }
        self.process = nil
    }

    deinit {
        stop()
    }
}
#endif

enum EventForwarderError: LocalizedError {
    case socketCreationFailed(code: Int32)
    case pathTooLong
    case connectFailed(code: Int32)
    case writeFailed(code: Int32)

    var errorDescription: String? {
        switch self {
        case let .socketCreationFailed(code):
            return "event socket 作成に失敗しました (errno=\(code))"
        case .pathTooLong:
            return "event socket パスが長すぎます"
        case let .connectFailed(code):
            return "event socket 接続に失敗しました (errno=\(code))"
        case let .writeFailed(code):
            return "event 送信に失敗しました (errno=\(code))"
        }
    }
}

final class EventForwarder {
    private let socketPath: String
    private let encoder: PropertyListEncoder

    init(socketPath: String) {
        self.socketPath = socketPath
        let encoder = PropertyListEncoder()
        encoder.outputFormat = .binary
        self.encoder = encoder
    }

    func sendAction(_ action: String, value: String? = nil) throws {
        let event = EventMessage(action: action, value: value)
        let payload = try encoder.encode(event)
        try send(payload)
    }

    private func send(_ payload: Data) throws {
        let fd = socket(AF_UNIX, SOCK_STREAM, 0)
        guard fd >= 0 else {
            throw EventForwarderError.socketCreationFailed(code: errno)
        }
        defer {
            close(fd)
        }

        var address = sockaddr_un()
        address.sun_family = sa_family_t(AF_UNIX)

        let pathCString = socketPath.utf8CString
        let pathMaxLength = MemoryLayout.size(ofValue: address.sun_path)
        guard pathCString.count <= pathMaxLength else {
            throw EventForwarderError.pathTooLong
        }

        socketPath.withCString { cString in
            withUnsafeMutablePointer(to: &address.sun_path) { sunPathPointer in
                let destination = UnsafeMutableRawPointer(sunPathPointer).assumingMemoryBound(to: CChar.self)
                _ = strncpy(destination, cString, pathMaxLength - 1)
            }
        }

        let connectResult = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                connect(fd, sockaddrPointer, socklen_t(MemoryLayout<sockaddr_un>.size))
            }
        }

        guard connectResult == 0 else {
            throw EventForwarderError.connectFailed(code: errno)
        }

        let didWriteAll = payload.withUnsafeBytes { rawBuffer -> Bool in
            guard let baseAddress = rawBuffer.baseAddress else {
                return false
            }

            var offset = 0
            while offset < payload.count {
                let written = write(fd, baseAddress.advanced(by: offset), payload.count - offset)
                if written <= 0 {
                    return false
                }
                offset += written
            }
            return true
        }

        guard didWriteAll else {
            throw EventForwarderError.writeFailed(code: errno)
        }
    }
}

enum UnixSocketServerError: LocalizedError {
    case socketCreationFailed(code: Int32)
    case pathTooLong
    case bindFailed(code: Int32)
    case listenFailed(code: Int32)

    var errorDescription: String? {
        switch self {
        case let .socketCreationFailed(code):
            return "socket 作成に失敗しました (errno=\(code))"
        case .pathTooLong:
            return "ソケットパスが長すぎます"
        case let .bindFailed(code):
            return "bind に失敗しました (errno=\(code))"
        case let .listenFailed(code):
            return "listen に失敗しました (errno=\(code))"
        }
    }
}

final class UnixSocketServer: @unchecked Sendable {
    private let socketPath: String
    private let queue = DispatchQueue(label: "stargrace.renderer.socket")
    private var serverFD: Int32 = -1
    private var isRunning = false

    init(socketPath: String) {
        self.socketPath = socketPath
    }

    func start(onMessage: @escaping @Sendable (Data) -> Void) throws {
        guard !isRunning else {
            return
        }
        isRunning = true

        unlink(socketPath)

        let fd = socket(AF_UNIX, SOCK_STREAM, 0)
        guard fd >= 0 else {
            throw UnixSocketServerError.socketCreationFailed(code: errno)
        }
        serverFD = fd

        var address = sockaddr_un()
        address.sun_family = sa_family_t(AF_UNIX)

        let pathCString = socketPath.utf8CString
        let pathMaxLength = MemoryLayout.size(ofValue: address.sun_path)
        guard pathCString.count <= pathMaxLength else {
            throw UnixSocketServerError.pathTooLong
        }

        socketPath.withCString { cString in
            withUnsafeMutablePointer(to: &address.sun_path) { sunPathPointer in
                let destination = UnsafeMutableRawPointer(sunPathPointer).assumingMemoryBound(to: CChar.self)
                _ = strncpy(destination, cString, pathMaxLength - 1)
            }
        }

        let bindResult = withUnsafePointer(to: &address) { pointer in
            pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) { sockaddrPointer in
                bind(fd, sockaddrPointer, socklen_t(MemoryLayout<sockaddr_un>.size))
            }
        }

        guard bindResult == 0 else {
            stop()
            throw UnixSocketServerError.bindFailed(code: errno)
        }

        guard listen(fd, SOMAXCONN) == 0 else {
            stop()
            throw UnixSocketServerError.listenFailed(code: errno)
        }

        queue.async { [weak self] in
            self?.acceptLoop(onMessage: onMessage)
        }
    }

    func stop() {
        isRunning = false

        if serverFD >= 0 {
            _ = shutdown(serverFD, SHUT_RDWR)
            close(serverFD)
            serverFD = -1
        }

        unlink(socketPath)
    }

    deinit {
        stop()
    }

    private func acceptLoop(onMessage: @escaping @Sendable (Data) -> Void) {
        while isRunning {
            let clientFD = accept(serverFD, nil, nil)
            if clientFD < 0 {
                if isRunning && errno != EINTR {
                    NSLog("accept 失敗: errno=%d", errno)
                }
                continue
            }

            var bytes = [UInt8](repeating: 0, count: 4096)
            var messageBytes: [UInt8] = []

            while true {
                let count = read(clientFD, &bytes, bytes.count)
                if count > 0 {
                    messageBytes.append(contentsOf: bytes[0..<count])
                    continue
                }
                break
            }

            close(clientFD)

            guard !messageBytes.isEmpty else {
                continue
            }

            onMessage(Data(messageBytes))
        }
    }
}
