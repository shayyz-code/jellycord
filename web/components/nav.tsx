import { UserMenu } from "@/components/user-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { motion, Variants } from "framer-motion"

export default function Nav() {
  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
      },
    },
  }

  return (
    <motion.div
      variants={itemVariants}
      className="absolute top-4 right-4 flex items-center gap-2 z-50"
    >
      <ModeToggle />
      <UserMenu />
    </motion.div>
  )
}
