"use client";

import { motion } from "framer-motion";
import Box, { type BoxProps } from "@mui/material/Box";

const varWrapBoth = {
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
  exit: {
    transition: { staggerChildren: 0.05, staggerDirection: -1 },
  },
};

type MotionContainerProps = BoxProps & {
  open?: boolean;
};

export default function MotionContainer({
  open,
  children,
  ...other
}: MotionContainerProps) {
  return (
    <Box
      initial={false}
      variants={varWrapBoth}
      component={motion.div}
      animate={open ? "animate" : "exit"}
      {...other}
    >
      {children}
    </Box>
  );
}
