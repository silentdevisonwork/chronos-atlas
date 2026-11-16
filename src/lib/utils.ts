import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
/** shadcn/ui class merger */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
