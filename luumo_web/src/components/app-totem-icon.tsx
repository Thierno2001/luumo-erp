import React from "react";

interface AppTotemIconProps {
  appId: string;
  className?: string;
  size?: number;
}

export function AppTotemIcon({ appId, className = "", size = 48 }: AppTotemIconProps) {
  switch (appId) {
    case "pos":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 52 52"
          fill="none"
          className={className}
          aria-hidden="true"
        >
          {/* Base caisse comptoir */}
          <rect x="6" y="22" width="40" height="22" rx="4" fill="#E8F2EE" stroke="#115040" strokeWidth="2.5" />
          {/* Écran d'affichage tactile Or */}
          <rect x="14" y="10" width="24" height="12" rx="2" fill="#F3BC33" />
          <line x1="18" y1="16" x2="34" y2="16" stroke="#0B2920" strokeWidth="2" strokeLinecap="round" />
          {/* Clavier numérique de touches */}
          <circle cx="15" cy="30" r="2.5" fill="#115040" />
          <circle cx="23" cy="30" r="2.5" fill="#115040" />
          <circle cx="31" cy="30" r="2.5" fill="#115040" />
          <circle cx="15" cy="37" r="2.5" fill="#115040" />
          <circle cx="23" cy="37" r="2.5" fill="#115040" />
          {/* Fente d'encaissement et tiroir */}
          <rect x="29" y="35" width="11" height="4" rx="1" fill="#10B981" />
        </svg>
      );

    case "orders":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 52 52"
          fill="none"
          className={className}
          aria-hidden="true"
        >
          {/* Feuille de facture officielle biseautée */}
          <path
            d="M12 8C12 6.89543 12.8954 6 14 6H34L42 14V44C42 45.1046 41.1046 46 40 46H14C12.8954 46 12 45.1046 12 44V8Z"
            fill="#E8F2EE"
            stroke="#115040"
            strokeWidth="2.5"
          />
          <path d="M34 6V14H42" stroke="#115040" strokeWidth="2" fill="#D2E4DC" />
          {/* En-tête de facture en Or */}
          <line x1="18" y1="20" x2="36" y2="20" stroke="#F3BC33" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="18" y1="27" x2="32" y2="27" stroke="#115040" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="18" y1="34" x2="28" y2="34" stroke="#115040" strokeWidth="1.8" strokeLinecap="round" />
          {/* Tampon de validation officiel */}
          <circle cx="36" cy="38" r="4.5" fill="#115040" />
        </svg>
      );

    case "inventory":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 52 52"
          fill="none"
          className={className}
          aria-hidden="true"
        >
          {/* Cube 3D géométrique de palette/stocks */}
          <path d="M26 6L44 16V36L26 46L8 36V16L26 6Z" fill="#E8F2EE" stroke="#115040" strokeWidth="2.5" />
          <path d="M26 6V26L44 16" stroke="#115040" strokeWidth="2" fill="#D2E4DC" />
          <path d="M26 26L8 16" stroke="#115040" strokeWidth="2" />
          <path d="M26 26V46" stroke="#115040" strokeWidth="2" />
          {/* Marqueur de disponibilité en stock Or */}
          <circle cx="26" cy="26" r="3.5" fill="#F3BC33" />
          <line x1="32" y1="29" x2="38" y2="33" stroke="#F3BC33" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "customers":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 52 52"
          fill="none"
          className={className}
          aria-hidden="true"
        >
          {/* Carnet de dettes traditionnel relié */}
          <rect x="12" y="8" width="30" height="36" rx="3" fill="#E8F2EE" stroke="#115040" strokeWidth="2.5" />
          {/* Spirales de reliure d'écolier en Or */}
          <circle cx="12" cy="15" r="2.5" fill="#F3BC33" />
          <circle cx="12" cy="24" r="2.5" fill="#F3BC33" />
          <circle cx="12" cy="33" r="2.5" fill="#F3BC33" />
          <line x1="19" y1="16" x2="36" y2="16" stroke="#115040" strokeWidth="2" strokeLinecap="round" />
          <line x1="19" y1="23" x2="32" y2="23" stroke="#115040" strokeWidth="2" strokeLinecap="round" />
          {/* Marque de remboursement acquitté */}
          <path d="M24 32L28 36L38 26" stroke="#F3BC33" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "purchases":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 52 52"
          fill="none"
          className={className}
          aria-hidden="true"
        >
          {/* Conteneur maritime / arrivage portuaire */}
          <rect x="8" y="16" width="36" height="24" rx="3" fill="#E8F2EE" stroke="#115040" strokeWidth="2.5" />
          <line x1="20" y1="16" x2="20" y2="40" stroke="#115040" strokeWidth="2" />
          <line x1="32" y1="16" x2="32" y2="40" stroke="#115040" strokeWidth="2" />
          <path d="M16 10L26 6L36 10" stroke="#F3BC33" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="26" cy="28" r="4" fill="#F3BC33" />
        </svg>
      );

    case "hr":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 52 52"
          fill="none"
          className={className}
          aria-hidden="true"
        >
          {/* Silhouette de collaborateur */}
          <circle cx="26" cy="16" r="8" fill="#E8F2EE" stroke="#115040" strokeWidth="2.5" />
          <path
            d="M12 40C12 32.268 18.268 26 26 26C33.732 26 40 32.268 40 40"
            stroke="#115040"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Badge de prime / salaire Or */}
          <circle cx="36" cy="34" r="5" fill="#F3BC33" />
          <line x1="36" y1="31" x2="36" y2="37" stroke="#0B2920" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );

    case "fleet":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 52 52"
          fill="none"
          className={className}
          aria-hidden="true"
        >
          {/* Camion / utilitaire de livraison */}
          <rect x="6" y="16" width="24" height="20" rx="2" fill="#E8F2EE" stroke="#115040" strokeWidth="2.5" />
          <path d="M30 22H38L44 28V36H30V22Z" fill="#D2E4DC" stroke="#115040" strokeWidth="2.5" />
          <circle cx="15" cy="38" r="4.5" fill="#0B2920" stroke="#F3BC33" strokeWidth="2" />
          <circle cx="37" cy="38" r="4.5" fill="#0B2920" stroke="#F3BC33" strokeWidth="2" />
          <line x1="12" y1="22" x2="24" y2="22" stroke="#115040" strokeWidth="2" />
        </svg>
      );

    case "dashboard":
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 52 52"
          fill="none"
          className={className}
          aria-hidden="true"
        >
          {/* Tableau d'indicateurs de gestion */}
          <rect x="8" y="8" width="36" height="36" rx="4" fill="#E8F2EE" stroke="#115040" strokeWidth="2.5" />
          <line x1="16" y1="36" x2="16" y2="28" stroke="#115040" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="26" y1="36" x2="26" y2="20" stroke="#F3BC33" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="36" y1="36" x2="36" y2="14" stroke="#115040" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
  }
}
