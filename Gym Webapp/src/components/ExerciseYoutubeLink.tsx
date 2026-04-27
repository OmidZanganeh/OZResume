import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { youtubeHowToSearchUrl } from '../utils/youtubeHowTo';

type Props = {
  exerciseName: string;
  className?: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'target' | 'rel' | 'children'>;

export function ExerciseYoutubeLink({ exerciseName, className, children, title, ...rest }: Props) {
  return (
    <a
      href={youtubeHowToSearchUrl(exerciseName)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...rest}
      title={title ?? `YouTube: how to do ${exerciseName}`}
    >
      {children}
    </a>
  );
}
