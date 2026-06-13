import { useState, useCallback } from 'react'
import {
  IndexTable,
  Card,
  Text,
  Badge,
  Button,
  ButtonGroup,
  Modal,
  TextField,
  Select,
  InlineStack,
  BlockStack,
  useIndexResourceState,
  Tabs,
} from '@shopify/polaris'
import { EditIcon, DeleteIcon } from '@shopify/polaris-icons'

const ZONE_COLORS = {
  microcrystalline: 'info',
  glossy: 'success',
  matte: 'warning',
  underfired: 'critical',
  unknown: undefined
}

const FOOD_SAFETY_TONES = {
  excellent: 'success',
  good: 'success',
  acceptable: 'warning',
  caution: 'critical',
  unknown: undefined
}

const STATUS_PROGRESS = {
  testing: 'incomplete',
  stable: 'complete',
  retired: 'incomplete'
}

export default function RecipeTable({ recipes, onSelectRecipe, onToggleFavourite, onDeleteRecipe, onEditRecipe, testResults, materials }) {
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterCone, setFilterCone] = useState('All')
  const [selectedTab, setSelectedTab] = useState(0)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState('name')
  const [sortDir, setSortDir] = useState('ascending')

  const resourceName = { singular: 'recipe', plural: 'recipes' }

  const types = ['All', ...new Set(recipes.map(r => r.recipeType).filter(Boolean))]
  const cones = ['All', ...new Set(recipes.map(r => r.cone).filter(Boolean))].sort()
  const statuses = ['All', 'testing', 'stable', 'retired']

  const isAvailable = (recipe) => {
    const slug = recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const hasCompletedTest = (testResults || []).some(
      r => r.recipeSlug === slug && r.status === 'completed'
    )
    if (!hasCompletedTest) return false
    const allIngredients = [
      ...(recipe.baseIngredients || []),
      ...(recipe.additives || [])
    ].filter(i => i.material)
    const allInStock = allIngredients.every(ing => {
      const mat = (materials || []).find(m => m.name.toLowerCase() === ing.material.toLowerCase())
      if (!mat) return true
      return mat.amount > 0
    })
    return allInStock
  }

  const isTested = (recipe) => {
    const slug = recipe.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return (testResults || []).some(r => r.recipeSlug === slug && r.status === 'completed')
  }

  const availableCount = recipes.filter(r => isAvailable(r)).length
  const testedCount = recipes.filter(r => isTested(r)).length
  const untestedCount = recipes.filter(r => !isTested(r)).length

  const tabs = [
    { id: 'all', content: 'All' },
    { id: 'available', content: `Available (${availableCount})` },
    { id: 'tested', content: `Tested (${testedCount})` },
    { id: 'untested', content: `Untested (${untestedCount})` },
  ]

  const filterByTab = (recipe) => {
    if (selectedTab === 0) return true
    if (selectedTab === 1) return isAvailable(recipe)
    if (selectedTab === 2) return isTested(recipe)
    if (selectedTab === 3) return !isTested(recipe)
    return true
  }

  const filtered = recipes
    .filter(filterByTab)
    .filter(r => filterType === 'All' || r.recipeType === filterType)
    .filter(r => filterStatus === 'All' || r.status === filterStatus)
    .filter(r => filterCone === 'All' || r.cone === filterCone)
    .filter(r => !search || r.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (selectedTab === 0) {
        const aAvail = isAvailable(a)
        const bAvail = isAvailable(b)
        if (aAvail && !bAvail) return -1
        if (!aAvail && bAvail) return 1
      }
      const getVal = (r) => {
        if (sortCol === 'zone') return r.chemistry?.stull?.zone || ''
        if (sortCol === 'foodSafety') return r.chemistry?.ratios?.foodSafety || ''
        return r[sortCol] || ''
      }
      const cmp = String(getVal(a)).localeCompare(String(getVal(b)))
      return sortDir === 'ascending' ? cmp : -cmp
    })

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(filtered)

  const handleSort = (col, dir) => {
    setSortCol(col)
    setSortDir(dir)
  }

  const confirmDelete = useCallback(() => {
    if (deleteTarget) {
      onDeleteRecipe(deleteTarget)
      setDeleteTarget(null)
    }
  }, [deleteTarget, onDeleteRecipe])

  const rowMarkup = filtered.map((recipe, index) => {
    const zone = recipe.chemistry?.stull?.zone || 'unknown'
    const foodSafety = recipe.chemistry?.ratios?.foodSafety || 'unknown'
    const available = isAvailable(recipe)
    const tested = isTested(recipe)

    return (
      <IndexTable.Row
        id={recipe.id}
        key={recipe.id}
        selected={selectedResources.includes(recipe.id)}
        position={index}
        onClick={() => onSelectRecipe(recipe)}
      >
        <IndexTable.Cell>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <Text variant="bodyMd" fontWeight="semibold">{recipe.name}</Text>
            {available && <Badge tone="success">Available</Badge>}
            {!available && tested && <Badge tone="info">Tested</Badge>}
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" tone="subdued">{recipe.recipeType}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd">Cone {recipe.cone}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text variant="bodyMd" tone="subdued">{recipe.atmosphere}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          {zone !== 'unknown' ? (
            <Badge tone={ZONE_COLORS[zone]}>{zone}</Badge>
          ) : (
            <Text tone="subdued">—</Text>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {foodSafety !== 'unknown' ? (
            <Badge tone={FOOD_SAFETY_TONES[foodSafety]}>{foodSafety}</Badge>
          ) : (
            <Text tone="subdued">—</Text>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge progress={STATUS_PROGRESS[recipe.status]}>
            {recipe.status}
          </Badge>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div onClick={e => e.stopPropagation()}>
            <ButtonGroup gap="tight">
              <Button
                icon={EditIcon}
                variant="plain"
                tone="base"
                accessibilityLabel="Edit recipe"
                onClick={() => onEditRecipe && onEditRecipe(recipe)}
              />
              <Button
                icon={DeleteIcon}
                variant="plain"
                tone="critical"
                accessibilityLabel="Delete recipe"
                onClick={() => setDeleteTarget(recipe)}
              />
            </ButtonGroup>
          </div>
        </IndexTable.Cell>
      </IndexTable.Row>
    )
  })

  return (
    <>
      {/* Tabs */}
      <Card padding="0">
        <Tabs
          tabs={tabs}
          selected={selectedTab}
          onSelect={setSelectedTab}
        />
      </Card>

      {/* Filters */}
      <Card>
        <BlockStack gap="300">
          <InlineStack gap="300" wrap>
            <div style={{flex: 1, minWidth: '200px'}}>
              <TextField
                label="Search"
                labelHidden
                placeholder="Search recipes..."
                value={search}
                onChange={setSearch}
                autoComplete="off"
                clearButton
                onClearButtonClick={() => setSearch('')}
              />
            </div>
            <Select
              label="Type"
              labelHidden
              options={types.map(t => ({ label: t === 'All' ? 'All Types' : t, value: t }))}
              value={filterType}
              onChange={setFilterType}
            />
            <Select
              label="Cone"
              labelHidden
              options={cones.map(c => ({ label: c === 'All' ? 'All Cones' : 'Cone ' + c, value: c }))}
              value={filterCone}
              onChange={setFilterCone}
            />
            <Select
              label="Status"
              labelHidden
              options={statuses.map(s => ({ label: s === 'All' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1), value: s }))}
              value={filterStatus}
              onChange={setFilterStatus}
            />
          </InlineStack>
          <Text variant="bodySm" tone="subdued">
            {filtered.length} {filtered.length === 1 ? 'recipe' : 'recipes'}
          </Text>
        </BlockStack>
      </Card>

      {/* Table */}
      <Card padding="0">
        <IndexTable
          resourceName={resourceName}
          itemCount={filtered.length}
          selectedItemsCount={allResourcesSelected ? 'All' : selectedResources.length}
          onSelectionChange={handleSelectionChange}
          sortable={[true, true, true, true, true, true, true, false]}
          sortDirection={sortDir}
          sortColumnIndex={['name','recipeType','cone','atmosphere','zone','foodSafety','status'].indexOf(sortCol)}
          onSort={(col, dir) => {
            const cols = ['name','recipeType','cone','atmosphere','zone','foodSafety','status']
            handleSort(cols[col], dir)
          }}
          headings={[
            { title: 'Name' },
            { title: 'Type' },
            { title: 'Cone' },
            { title: 'Atmosphere' },
            { title: 'Glaze Type' },
            { title: 'Food Safety' },
            { title: 'Status' },
            { title: 'Actions' },
          ]}
          emptyState={
            <div style={{padding: '40px', textAlign: 'center'}}>
              <Text tone="subdued">No recipes found.</Text>
            </div>
          }
        >
          {rowMarkup}
        </IndexTable>
      </Card>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete recipe?"
        primaryAction={{
          content: 'Delete',
          destructive: true,
          onAction: confirmDelete,
        }}
        secondaryActions={[{
          content: 'Cancel',
          onAction: () => setDeleteTarget(null),
        }]}
      >
        <Modal.Section>
          <Text>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
          </Text>
        </Modal.Section>
      </Modal>
    </>
  )
}