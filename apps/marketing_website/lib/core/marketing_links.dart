import 'open_external_link.dart';

const salesEmail = 'hello@queueflow.app';

void openDemoRequest() {
  final subject = Uri.encodeComponent('QueueFlow demo request');
  openExternalLink('mailto:$salesEmail?subject=$subject');
}

void openSalesContact({String subject = 'QueueFlow inquiry'}) {
  openExternalLink('mailto:$salesEmail?subject=${Uri.encodeComponent(subject)}');
}

void openGetStarted({String plan = 'Starter'}) {
  openSalesContact(subject: 'QueueFlow — Get started ($plan)');
}
