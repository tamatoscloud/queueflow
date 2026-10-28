/// The live queue board now lives in the shared `queueflow_ui` package so the
/// business app's "Serve guests" console uses the same design.
library;

export 'package:queueflow_ui/queueflow_ui.dart'
    show LiveBoardGuest, LiveBoardLine, LiveQueueBoard, liveBoardModeLabel;
