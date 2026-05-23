import styles from "./SideCategoryRail.module.css";

type SideCategoryRailItem = {
  id: string;
  name: string;
};

type SideCategoryRailProps = {
  items: SideCategoryRailItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

export const SideCategoryRail = ({
  items,
  selectedId,
  onSelect,
}: SideCategoryRailProps) => {
  return (
    <aside className={styles.rail}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`${styles.item} ${selectedId === item.id ? styles.selected : ""}`}
          onClick={() => onSelect(item.id)}
        >
          {item.name}
        </button>
      ))}
    </aside>
  );
};
