"use client";

import { useRef } from "react";
import Slider, { type Settings } from "react-slick";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import type { Creator } from "@/types/content";
import CreatorCard from "./CreatorCard";

type Props = { title: string; creators: Creator[] };

export default function CreatorRow({ title, creators }: Props) {
  const sliderRef = useRef<Slider>(null);
  const settings: Settings = {
    speed: 450,
    arrows: false,
    infinite: false,
    slidesToShow: 4,
    slidesToScroll: 2,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 3 } },
      { breakpoint: 900, settings: { slidesToShow: 2 } },
      { breakpoint: 600, settings: { slidesToShow: 1 } },
    ],
  };

  if (creators.length === 0) return null;

  return (
    <Box sx={{ mb: 3, pl: { xs: 2, md: 3 }, pr: { xs: 1, md: 2 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5, pr: 1 }}
      >
        <Typography component="h2" variant="h6" fontStyle="italic" fontWeight={800}>
          {title}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Typography
            component={Link}
            href="/creators"
            variant="body2"
            sx={{ color: "primary.main", fontWeight: 600, mr: 1 }}
          >
            See All →
          </Typography>
          <IconButton size="small" onClick={() => sliderRef.current?.slickPrev()}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={() => sliderRef.current?.slickNext()}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>
      <Slider ref={sliderRef} {...settings}>
        {creators.map((c) => (
          <Box key={c.id} sx={{ px: 1 }}>
            <CreatorCard creator={c} />
          </Box>
        ))}
      </Slider>
    </Box>
  );
}
