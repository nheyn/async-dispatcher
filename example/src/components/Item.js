/*
 * @flow
 */
import React from 'react';

type Props = {
  label: string,
  isChecked: bool,
  onCheckClicked: () => void
};

export default function Item({ label, isChecked, onCheckClicked }: Props): React.Element {
  return (
    <div>
      <input type="checkbox" checked={isChecked} onChange={onCheckClicked} />
      <label>{label}</label>
    </div>
  );
}