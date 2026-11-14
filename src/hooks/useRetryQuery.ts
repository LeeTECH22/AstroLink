import { useQuery } from '@tanstack/react-query'

export function useRetryQuery<TData = unknown>(
  key: readonly unknown[],
  queryFn: () => Promise<TData>,
  options: any = {}
) {
  return useQuery({
    queryKey: key,
    queryFn,
    retry: 3,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  })
}
