import 'package:web/web.dart' as web;

void openExternalLink(String url) {
  web.window.location.href = url;
}
