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
import type { PileItVideo } from "@/types/content";
import VideoItemWithHover from "./VideoItemWithHover";

type Props = {
  title: string;
  seeAllHref?: string;
  videos: PileItVideo[];
};

export default function ContentRow({ title, seeAllHref, videos }: Props) {
  const sliderRef = useRef<Slider>(null);
  const settings: Settings = {
    className: "pileit-content-row-slider",
    speed: 450,
    arrows: false,
    infinite: false,
    slidesToShow: 4,
    slidesToScroll: 2,
    responsive: [
      { breakpoint: 1200, settings: { slidesToShow: 3, slidesToScroll: 2 } },
      { breakpoint: 900, settings: { slidesToShow: 2, slidesToScroll: 1 } },
      { breakpoint: 600, settings: { slidesToShow: 1, slidesToScroll: 1 } },
    ],
  };

  if (videos.length === 0) return null;

  return (
    <Box sx={{ mb: 3, pl: { xs: 2, md: 3 }, pr: { xs: 1, md: 2 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5, pr: 1 }}
      >
        <Typography variant="h6" fontStyle="italic" fontWeight={800}>
          {title}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          {seeAllHref && (
            <Typography
              component={Link}
              href={seeAllHref}
              variant="body2"
              sx={{ color: "primary.main", fontWeight: 600 }}
            >
              See All →
            </Typography>
          )}
          <IconButton
            size="small"
            onClick={() => sliderRef.current?.slickPrev()}
            aria-label="Previous"
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => sliderRef.current?.slickNext()}
            aria-label="Next"
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>
      <Box sx={{ position: "relative", overflow: "visible" }}>
        <Slider ref={sliderRef} {...settings}>
          {videos.map((v) => (
            <Box key={v.id} sx={{ px: 1 }}>
              <VideoItemWithHover video={v} />
            </Box>
          ))}
        </Slider>
      </Box>
    </Box>
  );
}
