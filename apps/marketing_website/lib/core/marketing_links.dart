import 'open_external_link.dart';

const salesEmail = 'hello@Quyk.app';

void openDemoRequest() {
  final subject = Uri.encodeComponent('Quyk demo request');
  openExternalLink('mailto:$salesEmail?subject=$subject');
}

void openSalesContact({String subject = 'Quyk inquiry'}) {
  openExternalLink('mailto:$salesEmail?subject=${Uri.encodeComponent(subject)}');
}

void openGetStarted({String plan = 'Starter'}) {
  openSalesContact(subject: 'Quyk — Get started ($plan)');
}
