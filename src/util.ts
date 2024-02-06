export function draw_image_centered(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const dx = Math.max(0, canvas.width - img.width) * 0.5;
  const dy = Math.max(0, canvas.height - img.height) * 0.5;
  ctx.drawImage(img, dx, dy);
}

export async function prepare_images(parent: HTMLElement, im_ps: string[]): Promise<HTMLImageElement[]> {
  return Promise.all(im_ps.map(load_one_image));

  function load_one_image(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.src = src;
      img.style.display = 'none';
      img.onload = () => resolve(img);
      parent.appendChild(img);
    });
  }
}

export async function show_image(
  img: HTMLImageElement, canvas: HTMLCanvasElement, 
  ctx: CanvasRenderingContext2D, num_frames: number): Promise<number> {
  //
  return new Promise((resolve, reject) => {
    draw_n_frames(num_frames);

    function draw_n_frames(num_frames: number) {
      let frame_index = 0;
      let t0 = performance.now();

      requestAnimationFrame(draw_loop);

      function draw_func(draw_im: boolean) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (draw_im) {
          draw_image_centered(canvas, ctx, img);
        }
        if (frame_index === 0) {
          t0 = performance.now();
        }
        return performance.now() - t0;
      }

      function draw_loop() {
        if (frame_index < num_frames) {
          draw_func(true);
          ++frame_index;
          requestAnimationFrame(draw_loop);
        } else {
          const elapsed = draw_func(false);
          resolve(elapsed);
        }
      }
    }
  });
}

export function standardize_isi(isi: number) {
  const hzs = [24, 30, 60, 75, 120, 144, 240];

  for (let i = 0; i < hzs.length; i++) {
    const dist = Math.abs(hzs[i] - 1 / isi);
    if (dist <= 2) {
      return 1 / hzs[i];
    }
  }

  return 1 / Math.max(1, Math.round(1 / Math.max(1e-3, isi)));
}

export async function estimate_screen_isi(num_frames: number | null = null): Promise<number> {
  return new Promise((resolve, reject) => {
    let last_time = 0;
    let first_time = true;
    let sample_deltas: Array<number> = [];

    if (num_frames === null) {
      num_frames = 128;
    }

    requestAnimationFrame(loop);

    function loop() {
      const curr_t = performance.now();

      if (first_time) {
        first_time = false;
      } else {
        sample_deltas.push((curr_t - last_time) * 1e-3);
      }

      last_time = curr_t;

      if (sample_deltas.length === num_frames) {
        let s = 0;
        for (let i = 0; i < sample_deltas.length; i++) {
          s += sample_deltas[i];
        }
        resolve(s / sample_deltas.length);
      } else {
        requestAnimationFrame(loop);
      }
    }
  });
}