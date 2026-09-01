import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InitialsAvatar } from './InitialsAvatar';

describe('InitialsAvatar', () => {
  it('renders the uppercased first letter of each name', () => {
    render(<InitialsAvatar firstName="ngozi" lastName="eze" />);
    expect(screen.getByText('NE')).toBeInTheDocument();
  });

  it('is deterministic — same name always gets the same color class', () => {
    const { container: first } = render(<InitialsAvatar firstName="Ada" lastName="Okafor" />);
    const { container: second } = render(<InitialsAvatar firstName="Ada" lastName="Okafor" />);
    expect(first.firstChild?.textContent).toBe(second.firstChild?.textContent);
    expect(first.querySelector('div')?.className).toBe(second.querySelector('div')?.className);
  });

  it('handles a missing name part gracefully', () => {
    render(<InitialsAvatar firstName="" lastName="Smith" />);
    expect(screen.getByText('S')).toBeInTheDocument();
  });
});
