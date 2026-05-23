import styles from "./SidebarNav.module.css";

type SidebarDestination = {
  id: string;
  title: string;
  icon: string;
};

type SidebarNavProps = {
  destinations: SidebarDestination[];
  selectedId: string;
  onDestinationSelected: (id: string) => void;
  expanded?: boolean;
};

export const SidebarNav = ({
  destinations,
  selectedId,
  onDestinationSelected,
  expanded = false,
}: SidebarNavProps) => {
  return (
    <nav className={`${styles.sidebar} ${expanded ? styles.expanded : ""}`}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>S</div>
        <div className={styles.brandText}>SMARTIFLY</div>
      </div>
      <div className={styles.items}>
        {destinations.map((destination) => (
          <button
            key={destination.id}
            type="button"
            className={`${styles.navItem} ${
              selectedId === destination.id ? styles.selected : ""
            }`}
            onClick={() => onDestinationSelected(destination.id)}
          >
            <span aria-hidden="true">{destination.icon}</span>
            <span className={styles.label}>{destination.title}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};
