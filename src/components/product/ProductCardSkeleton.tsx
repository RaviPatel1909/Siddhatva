import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const ProductCardSkeleton: React.FC = () => (
  <div className="flex flex-col gap-sm">
    <Skeleton className="aspect-[3/4] rounded-lg" />
    <Skeleton className="h-3 w-1/3 mt-xs" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="h-4 w-1/4" />
  </div>
);
