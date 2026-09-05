import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {fontFamily, palette} from '../constants';

const values = [
  [0.94, 0.42, 0.68, 0.31],
  [0.46, 0.91, 0.38, 0.62],
  [0.65, 0.41, 0.96, 0.55],
  [0.29, 0.64, 0.57, 0.92],
];

export const CrossPlayMatrix: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: 350, top: 45, width: 860, fontFamily}}>
      <div style={{display: 'grid', gridTemplateColumns: '110px repeat(4, 135px)', gap: 10, alignItems: 'center'}}>
        <div />
        {['B1', 'B2', 'B3', 'B4'].map((label) => <div key={label} style={{fontSize: 24, fontWeight: 850, textAlign: 'center', color: palette.muted}}>{label}</div>)}
        {values.flatMap((row, rowIndex) => [
          <div key={`label-${rowIndex}`} style={{fontSize: 24, fontWeight: 850, color: palette.muted, textAlign: 'right', paddingRight: 10}}>A{rowIndex + 1}</div>,
          ...row.map((value, columnIndex) => {
            const progress = interpolate(frame, [12 + (rowIndex * 4 + columnIndex) * 4, 28 + (rowIndex * 4 + columnIndex) * 4], [0, 1], {easing: Easing.bezier(0.16, 1, 0.3, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
            const isDiagonal = rowIndex === columnIndex;
            return <div key={`${rowIndex}-${columnIndex}`} style={{height: 110, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `rgba(30,144,255,${0.12 + value * 0.75})`, color: value > 0.62 ? palette.white : palette.navy, border: isDiagonal ? `5px solid ${palette.navy}` : `2px solid ${palette.white}`, fontSize: 28, fontWeight: 900, opacity: progress, scale: progress}}>{value.toFixed(2)}</div>;
          }),
        ])}
      </div>
      <div style={{textAlign: 'center', marginTop: 20, fontSize: 23, fontWeight: 750, color: palette.muted}}>Illustrative cross-play returns. Rows and columns are independently trained policies.</div>
    </div>
  );
};
