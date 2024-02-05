import * as util from './util';

type PresentTime = {
  name: string, time: number, frames: number
}

type Page = {
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
  header: HTMLDivElement
}

const PRESENT_TIMES: PresentTime[] = [
  {
    name: 'short',
    time: 34 * 1e-3,
    frames: 0
  },
  {
    name: 'medium',
    time: 84 * 1e-3,
    frames: 0
  },
  {
    name: 'long',
    time: 167 * 1e-3,
    frames: 0
  }
];

const CANVAS_INFO = {
  width: 512,
  height: 512,
  rate_begin_fraction: 0.125
}

function get_present_time(name: 'short' | 'medium' | 'long') {
  if (name === 'short') {
    return PRESENT_TIMES[0];
  } else if (name === 'medium') {
    return PRESENT_TIMES[1];
  } else {
    return PRESENT_TIMES[2];
  }
}

function create_instruction_header() {
  const res = create_div();
  res.style.height = '64px';
  res.style.width = '100%';
  return res;
}

function configure_body() {
  document.body.style.display = 'flex';
  document.body.style.alignItems = 'center';
  document.body.style.justifyContent = 'center';
}

function create_div() {
  const div = document.createElement('div');
  div.style.display = 'flex';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  return div;
}

function create_canvas() {
  const canvas = document.createElement('canvas');
  const w = CANVAS_INFO.width;
  const h = CANVAS_INFO.height;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.style.border = 'solid 2px';
  canvas.style.outline = 'none';
  return canvas;
}

function create_page(): Page {
  const cont = create_div();
  const header = create_instruction_header();
  const canvas = create_canvas();
  cont.style.flexDirection = 'column';
  cont.appendChild(header);
  cont.appendChild(canvas);
  return {
    canvas: canvas,
    container: cont,
    header: header
  }
}

function draw_starting_line(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const f = CANVAS_INFO.rate_begin_fraction;
  ctx.beginPath();
  ctx.moveTo(canvas.width * f, 0);
  ctx.lineTo(canvas.width * f, canvas.height);
  ctx.closePath();
  ctx.stroke();
}

async function show_image(
  page: Page, img: HTMLImageElement, num_frames: number): Promise<number> {
  //
  const ctx = page.canvas.getContext('2d')!;
  return await util.show_image(img, page.canvas, ctx, num_frames);
}

async function show_fixation_cross(
  page: Page, img: HTMLImageElement, time_ms: number): Promise<void> {
  //
  return new Promise((resolve, reject) => {
    const canvas = page.canvas;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (true) {
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = `rgb(0, 255, 0)`;
      ctx.fill();
    } else {
      ctx.drawImage(img, 0, 0);
    }

    setTimeout(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      resolve();
    }, time_ms);
  });
}

async function prepare_to_rate(page: Page): Promise<void> {
  return new Promise((resolve, reject) => {
    page.header.innerText = 'Move mouse to the left of the line to begin';

    const canvas = page.canvas;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.rect(0, 0, canvas.width, canvas.height);
    // ctx.fillStyle = `rgb(0, 255, 0)`;
    // ctx.fill();
    draw_starting_line(canvas, ctx);

    canvas.addEventListener('mousemove', listener);

    function complete_trial() {
      canvas.removeEventListener('mousemove', listener);
      resolve();
    }

    function listener(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const f = CANVAS_INFO.rate_begin_fraction;
      if (e.offsetX / w <= f) {
        complete_trial();
      }
    }
  });
}

async function rate(page: Page, ims: HTMLImageElement[]): Promise<number> {
  return new Promise((resolve, reject) => {
    page.header.innerText = 'Estimate the average emotion expressed in the sequence of faces you saw';

    const canvas = page.canvas;
    const ctx = canvas.getContext('2d')!;
    const f = CANVAS_INFO.rate_begin_fraction;

    function get_rating(e: MouseEvent) {
      const r = canvas.getBoundingClientRect();
      const off_amt = CANVAS_INFO.rate_begin_fraction * r.width;
      const tot_width = r.width - off_amt;
      const pos_x = Math.max(off_amt, e.offsetX);
      const ind = Math.floor(ims.length * Math.max(0, Math.min(1 - 1e-5, pos_x / tot_width)));
      return ind + 1;
    }

    function do_draw(rating: number, show_rating: boolean) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (show_rating) {
        ctx.font = "24px Arial";
        ctx.strokeText(`Rating: ${rating}`, canvas.width * 0.5, canvas.height * 0.5);
      }

      if (rating > 0 && rating <= ims.length) {
        ctx.drawImage(ims[rating - 1], 0, 0);
      }

      // draw_starting_line(canvas, ctx);
    }

    function move_listener(e: MouseEvent) {
      const rating = get_rating(e);
      do_draw(rating, true);
    }

    function click_listener(e: MouseEvent) {
      canvas.removeEventListener('mousemove', move_listener);
      canvas.removeEventListener('click', click_listener)
      resolve(get_rating(e));
    }

    canvas.addEventListener('mousemove', move_listener);
    canvas.addEventListener('click', click_listener);
  });
}

type TrialDesc = {
  im_urls: string[],
  fix_time: number,
  present_time: PresentTime,
}

type TrialParams = {
  desc: TrialDesc,
  sequence_imgs: HTMLImageElement[],
  rating_imgs: HTMLImageElement[],
  fix_img: HTMLImageElement
}

type TrialResult = {
  rating: number
}

async function trial(page: Page, params: TrialParams): Promise<TrialResult> {
  for (let i = 0; i < params.sequence_imgs.length; i++) {
    await show_image(page, params.sequence_imgs[i], params.desc.present_time.frames);
    await show_fixation_cross(page, params.fix_img, params.desc.fix_time);
  }
  await prepare_to_rate(page);
  const rating = await rate(page, params.rating_imgs);
  return {
    rating
  }
}

function select_images_by_urls(seq_urls: string[], urls: string[], imgs: HTMLImageElement[]) {
  if (urls.length !== imgs.length) {
    throw new Error('Expected matching lenghts for urls and images.');
  }
  return seq_urls.map(url => imgs[urls.indexOf(url)]);
}

async function main() {
  configure_body();

  const s = await util.estimate_screen_isi();
  const est_s = util.standardize_isi(s);
  console.log('isi is: ', s, 'standard isi is: ', est_s, 'refresh rate is: ', 1/s);

  const im_ps = [
    'dist/img/mcaq.png', 'dist/img/mcaq2.png', 
    'dist/img/tracked_face.png', 'dist/img/imag.jpg'];

  const ims = await util.prepare_images(document.body, im_ps);

  const present_frames = PRESENT_TIMES.map(t => Math.max(1, Math.floor(t.time / est_s)));
  console.log('present frames: ', present_frames);
  for (let i = 0; i < present_frames.length; i++) {
    PRESENT_TIMES[i].frames = present_frames[i];
  }

  const page = create_page();
  document.body.appendChild(page.container);

  const trial_descs: TrialDesc[] = [];

  trial_descs.push({
    im_urls: [im_ps[0], im_ps[1]],
    fix_time: 400,
    present_time: get_present_time('short')
  });

  trial_descs.push({
    im_urls: [im_ps[1], im_ps[1]],
    fix_time: 400,
    present_time: get_present_time('long')
  });

  const trial_params: TrialParams[] = trial_descs.map(desc => {
    const params: TrialParams = {
      desc,
      sequence_imgs: select_images_by_urls(desc.im_urls, im_ps, ims),
      rating_imgs: ims,
      fix_img: ims[ims.length - 1]
    }
    return params;
  })

  for (let i = 0; i < trial_params.length; i++) {
    await trial(page, trial_params[i]);
  }

  document.body.removeChild(page.container);
}

main();