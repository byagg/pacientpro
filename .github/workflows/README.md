# GitHub Actions Workflows

## Neon Branches Workflow

Tento workflow automaticky vytvára a mazá Neon databázové branchy pre každý Pull Request.

### Nastavenie

1. **Vytvorte GitHub Secret:**
   - Prejdite do Settings → Secrets and variables → Actions
   - Pridajte secret: `NEON_API_KEY`
   - Hodnota: Váš Neon API kľúč (získate z [Neon Console](https://console.neon.tech/))

2. **Vytvorte GitHub Variable:**
   - Prejdite do Settings → Secrets and variables → Actions → Variables
   - Pridajte variable: `NEON_PROJECT_ID`
   - Hodnota: ID vášho Neon projektu

### Ako to funguje

- **Pri otvorení PR:** Vytvorí sa nový Neon branch s názvom `preview/pr-{PR_NUMBER}-{BRANCH_NAME}`
- **Pri update PR:** Branch sa aktualizuje
- **Pri zatvorení PR:** Branch sa automaticky vymaže
- **Expirácia:** Branchy expirujú po 14 dňoch

### Voliteľné rozšírenia

V workflow súbori môžete odkomentovať:
- **Run Migrations:** Automatické spustenie migrácií pri vytvorení branchu
- **Schema Diff:** Zobrazenie rozdielov v databázovom schéme v PR komentári

### Príklad použitia DATABASE_URL v iných workflows

```yaml
env:
  DATABASE_URL: "${{ needs.create_neon_branch.outputs.db_url_with_pooler }}"
```

