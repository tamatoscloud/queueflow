import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TokenDisplay } from '@/components/queue/token-display';

describe('TokenDisplay', () => {
  it('renders display code with accessible label', () => {
    render(<TokenDisplay code="A-042" />);
    expect(screen.getByLabelText('Queue token A-042')).toBeInTheDocument();
    expect(screen.getByText('A-042')).toBeInTheDocument();
  });
});
