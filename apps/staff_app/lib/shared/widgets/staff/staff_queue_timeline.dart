import 'package:flutter/material.dart';
import 'package:queueflow_theme/queueflow_theme.dart';

enum StaffQueueJourneyStep {
  joined,
  waiting,
  almostReady,
  called,
  seated,
  completed,
}

StaffQueueJourneyStep staffJourneyFromStatus(String status, {int? position}) {
  switch (status) {
    case 'COMPLETED':
      return StaffQueueJourneyStep.completed;
    case 'CALLED':
      return StaffQueueJourneyStep.called;
    case 'HOLDING':
      return StaffQueueJourneyStep.almostReady;
    case 'WAITING':
      if (position != null && position <= 2) return StaffQueueJourneyStep.almostReady;
      return StaffQueueJourneyStep.waiting;
    default:
      return StaffQueueJourneyStep.joined;
  }
}

class StaffQueueTimeline extends StatelessWidget {
  const StaffQueueTimeline({super.key, required this.current});

  final StaffQueueJourneyStep current;

  static const _labels = [
    'Joined',
    'Waiting',
    'Almost ready',
    'Called',
    'Seated',
    'Completed',
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = current.index;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < _labels.length; i++) ...[
            _StepDot(
              label: _labels[i],
              state: i < currentIndex
                  ? _StepState.done
                  : i == currentIndex
                      ? _StepState.active
                      : _StepState.pending,
            ),
            if (i < _labels.length - 1)
              Icon(
                Icons.arrow_downward,
                size: 14,
                color: i < currentIndex ? AppColors.success : AppColors.neutral300,
              ),
          ],
        ],
      ),
    );
  }
}

enum _StepState { done, active, pending }

class _StepDot extends StatelessWidget {
  const _StepDot({required this.label, required this.state});

  final String label;
  final _StepState state;

  @override
  Widget build(BuildContext context) {
    final color = switch (state) {
      _StepState.done => AppColors.success,
      _StepState.active => AppColors.primary,
      _StepState.pending => AppColors.neutral300,
    };
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Column(
        children: [
          Container(
            width: state == _StepState.active ? 12 : 8,
            height: state == _StepState.active ? 12 : 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
              boxShadow: state == _StepState.active
                  ? [BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: 8)]
                  : null,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontWeight: state == _StepState.active ? FontWeight.w700 : FontWeight.w500,
                  color: state == _StepState.pending ? AppColors.neutral500 : AppColors.neutral800,
                ),
          ),
        ],
      ),
    );
  }
}
