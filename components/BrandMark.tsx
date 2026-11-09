// The T1 mark from public/logo-mark.svg, inline so ImageResponse (share images) can draw it.
const WHITE = "M1043 170L286 171L190 329L468 330L375 677L443 678L496 614L565 614L647 329L921 329Z M542 706L511 706L480 744L358 744L330 858L506 857Z M1024 309L832 403L777 435L753 524L843 474L825 558L990 451Z M982 489L815 596L753 857L896 857Z";
const RED = "M991 451L747 608L698 548L586 670L555 640L507 640L457 697L230 696L214 723L468 723L519 665L545 666L586 707L697 587L739 639L743 641L982 488Z";

export function BrandMark({ height }: { height: number }) {
  return (
    <svg width={Math.round(height * 853 / 688)} height={height} viewBox="190 170 853 688" xmlns="http://www.w3.org/2000/svg">
      <path fill="#fff" d={WHITE} />
      <path fill="#e10600" d={RED} />
    </svg>
  );
}
