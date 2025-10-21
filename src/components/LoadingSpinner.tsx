
import { motion } from 'framer-motion'
import type { LoadingSpinnerProps } from '../types'

const LoadingSpinner = ({ 
  size = 'md', 
  text = 'Loading...' 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full`}
      />
      {text && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-gray-300 text-center"
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}

export default LoadingSpinner