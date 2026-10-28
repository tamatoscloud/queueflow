import 'open_external_link.dart';

const salesEmail = 'hello@quyk.app';

/// Live apps the landing page links to.
const businessAppUrl = 'https://queueflow-business-alpha.vercel.app';
const staffAppUrl = 'https://queueflow-staff.vercel.app';

/// Public demo line (Bella Vista) — lets visitors try the guest view.
const guestDemoUrl = 'https://queueflow-six-beta.vercel.app';

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

void openBusinessSignIn() => openExternalLink(businessAppUrl);

void openStaffSignIn() => openExternalLink(staffAppUrl);

void openGuestDemo() => openExternalLink(guestDemoUrl);
