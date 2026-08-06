import type { ServiceMode } from '@/lib/api/types';

export type EndedVariant = 'cancelled' | 'expired' | 'no_show' | 'skipped';

export type ServiceModeCopy = {
  mode: ServiceMode;
  queueLabel: string;
  aheadLabel: string;
  aheadLabelSingular: string;
  waitLabel: string;
  heroSubtitle: string;
  walletTitle: string;
  almostTitle: string;
  readyTitle: string;
  readyDescription: (branchName: string) => string;
  readyHoldMessage: string;
  completedTitle: string;
  completedSubtitle: string;
  visitAgainLabel: string;
  tokenLabel: string;
  joinNotifyMessage: string;
  waitingCountSingular: string;
  waitingCountPlural: string;
  liveQueueTitle: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  notificationHint: string;
  timeline: {
    joined: string;
    confirmed: string;
    waiting: string;
    almost: string;
    ready: string;
    seated: string;
  };
  ended: Record<
    EndedVariant,
    { title: string; description: string; rejoinLabel: string }
  >;
  callNextLabel: string;
  primaryCompleteLabel: string;
  whileYouWaitTitle: string;
  positionLadderTitle: string;
};

const DINE_IN_COPY: ServiceModeCopy = {
  mode: 'DINE_IN',
  queueLabel: "You're on the list",
  aheadLabel: 'parties ahead',
  aheadLabelSingular: 'party ahead',
  waitLabel: 'About',
  heroSubtitle: "You're in the queue",
  walletTitle: 'Your place',
  almostTitle: 'Almost your turn',
  readyTitle: 'Your table is ready!',
  readyDescription: (branch) => `Please proceed to reception at ${branch}.`,
  readyHoldMessage: 'Your table will be held for 5 minutes.',
  completedTitle: 'Thanks for dining with us',
  completedSubtitle: 'We hope you enjoyed your visit.',
  visitAgainLabel: 'Visit again',
  tokenLabel: 'Your number',
  joinNotifyMessage: "We'll let you know when your table is ready.",
  waitingCountSingular: 'party waiting',
  waitingCountPlural: 'parties waiting',
  liveQueueTitle: 'Current wait',
  welcomeTitle: "You're on the list!",
  welcomeSubtitle: "We'll keep you updated on your table.",
  notificationHint: "We'll text you when you're almost up.",
  timeline: {
    joined: 'Joined',
    confirmed: 'Confirmed',
    waiting: 'Waiting',
    almost: 'Almost there',
    ready: 'Table ready',
    seated: 'Seated',
  },
  ended: {
    cancelled: {
      title: 'Your spot was cancelled',
      description: 'Your place in the queue is no longer active. You can join again if you still plan to visit.',
      rejoinLabel: 'Join again',
    },
    expired: {
      title: 'Your session expired',
      description: 'Your place in the queue has expired. Tap below to get back in line.',
      rejoinLabel: 'Join again',
    },
    no_show: {
      title: 'We missed you',
      description: 'We called your number but could not seat you. Rejoin if you are still nearby.',
      rejoinLabel: 'Join again',
    },
    skipped: {
      title: 'Your turn passed',
      description: 'Your spot was released. Join again if you would still like to dine with us.',
      rejoinLabel: 'Join again',
    },
  },
  callNextLabel: 'Call',
  primaryCompleteLabel: 'Seat',
  whileYouWaitTitle: 'While you wait',
  positionLadderTitle: 'Queue position',
};

const TAKEAWAY_COPY: ServiceModeCopy = {
  mode: 'TAKEAWAY',
  queueLabel: "You're on the pickup list",
  aheadLabel: 'orders ahead',
  aheadLabelSingular: 'order ahead',
  waitLabel: 'About',
  heroSubtitle: 'Your order is being prepared',
  walletTitle: 'Pickup status',
  almostTitle: 'Almost ready',
  readyTitle: 'Your order is ready!',
  readyDescription: () => 'Please collect your order at the counter.',
  readyHoldMessage: 'We will hold your order for a few minutes.',
  completedTitle: 'Thanks for your order',
  completedSubtitle: 'Your order has been completed. Thanks for choosing us.',
  visitAgainLabel: 'Order again',
  tokenLabel: 'Pickup number',
  joinNotifyMessage: "We'll let you know when your order is ready for pickup.",
  waitingCountSingular: 'order waiting',
  waitingCountPlural: 'orders waiting',
  liveQueueTitle: 'Kitchen queue',
  welcomeTitle: "You're on the pickup list!",
  welcomeSubtitle: "We'll update you as your order is prepared.",
  notificationHint: "We'll notify you when your order is almost ready.",
  timeline: {
    joined: 'Linked',
    confirmed: 'Confirmed',
    waiting: 'Preparing',
    almost: 'Almost ready',
    ready: 'Ready for pickup',
    seated: 'Collected',
  },
  ended: {
    cancelled: {
      title: 'Order cancelled',
      description: 'Your pickup spot is no longer active. Join again if you still need your order.',
      rejoinLabel: 'Join pickup queue',
    },
    expired: {
      title: 'Your pickup session expired',
      description: 'Your place in the pickup queue has expired. Join again to collect your order.',
      rejoinLabel: 'Join pickup queue',
    },
    no_show: {
      title: 'We missed you',
      description: 'We called your order but it was not collected. Rejoin if you are still at the venue.',
      rejoinLabel: 'Join pickup queue',
    },
    skipped: {
      title: 'Your turn passed',
      description: 'Your pickup spot was released. Join again if you still need your order.',
      rejoinLabel: 'Join pickup queue',
    },
  },
  callNextLabel: 'Call order',
  primaryCompleteLabel: 'Collected',
  whileYouWaitTitle: 'While we prepare',
  positionLadderTitle: 'Kitchen queue',
};

const DRIVE_IN_COPY: ServiceModeCopy = {
  mode: 'DRIVE_IN',
  queueLabel: "You're in the drive-in queue",
  aheadLabel: 'cars ahead',
  aheadLabelSingular: 'car ahead',
  waitLabel: 'About',
  heroSubtitle: 'Stay in your vehicle',
  walletTitle: 'Your place in line',
  almostTitle: "You're almost next",
  readyTitle: "We're coming to your car!",
  readyDescription: () => 'Please remain in your vehicle. A team member is on the way.',
  readyHoldMessage: 'We will wait a few minutes at your vehicle.',
  completedTitle: 'Thanks for visiting',
  completedSubtitle: 'Your visit is complete. Thanks for stopping by.',
  visitAgainLabel: 'Visit again',
  tokenLabel: 'Lane number',
  joinNotifyMessage: "We'll let you know when we're ready for your vehicle.",
  waitingCountSingular: 'car waiting',
  waitingCountPlural: 'cars waiting',
  liveQueueTitle: 'Drive-in queue',
  welcomeTitle: "You're in the drive-in queue!",
  welcomeSubtitle: 'Stay in your vehicle — we will come to you.',
  notificationHint: "We'll notify you when you're almost next.",
  timeline: {
    joined: 'Joined',
    confirmed: 'Confirmed',
    waiting: 'Waiting',
    almost: 'Almost your turn',
    ready: 'On the way',
    seated: 'Complete',
  },
  ended: {
    cancelled: {
      title: 'Your spot was cancelled',
      description: 'Your place in the drive-in queue is no longer active. Join again if you are still in the lane.',
      rejoinLabel: 'Join drive-in queue',
    },
    expired: {
      title: 'Your session expired',
      description: 'Your place in the drive-in queue has expired. Join again to continue waiting.',
      rejoinLabel: 'Join drive-in queue',
    },
    no_show: {
      title: 'We missed you',
      description: 'We called your vehicle but could not reach you. Rejoin if you are still waiting.',
      rejoinLabel: 'Join drive-in queue',
    },
    skipped: {
      title: 'Your turn passed',
      description: 'Your spot was released. Join again if you are still in the drive-in lane.',
      rejoinLabel: 'Join drive-in queue',
    },
  },
  callNextLabel: 'Call',
  primaryCompleteLabel: 'Serve',
  whileYouWaitTitle: 'While you wait',
  positionLadderTitle: 'Lane position',
};

export function getServiceModeCopy(mode?: ServiceMode): ServiceModeCopy {
  switch (mode) {
    case 'TAKEAWAY':
      return TAKEAWAY_COPY;
    case 'DRIVE_IN':
      return DRIVE_IN_COPY;
    case 'DINE_IN':
    default:
      return DINE_IN_COPY;
  }
}

export function formatAhead(count: number, copy: ServiceModeCopy): string {
  if (count === 0) return "You're next!";
  if (count === 1) return `1 ${copy.aheadLabelSingular}`;
  return `${count} ${copy.aheadLabel}`;
}

export function formatWaitMinutes(minutes: number, copy: ServiceModeCopy): string {
  if (minutes <= 0) return 'Any moment now';
  return `${copy.waitLabel} ${minutes} min`;
}

export function formatWaitingCount(count: number, copy: ServiceModeCopy): string {
  if (count === 1) return `1 ${copy.waitingCountSingular}`;
  return `${count} ${copy.waitingCountPlural}`;
}
