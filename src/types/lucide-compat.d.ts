declare module 'lucide-react/dist/esm/icons/*' {
  import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from 'react'
  export type LucideProps = SVGProps<SVGSVGElement> & {
    color?: string
    size?: string | number
    strokeWidth?: string | number
    absoluteStrokeWidth?: boolean
    className?: string
  }
  const Icon: ForwardRefExoticComponent<LucideProps & RefAttributes<SVGSVGElement>>
  export default Icon
}
