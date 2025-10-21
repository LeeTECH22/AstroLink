import { useQuery } from 'react-query'

export const useRetryQuery = <T>(
    key: string | (string | number)[],
    queryFn: () => Promise<T>,
    options?: any
) => {
    return useQuery(key, queryFn, {
        retry: 3,
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        ...options,
    })
}