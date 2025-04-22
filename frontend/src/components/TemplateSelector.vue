<script setup lang="ts">
import { ref, defineEmits, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

// Watch for language changes and update templates
watch(locale, (newLocale) => {
  // Force template refresh when language changes
  updateTemplateLabels();
});

const emit = defineEmits(['update:modelValue', 'select-template']);

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
});

// Define templates with Vue Flow format and SVG previews
const templates = ref([
{
  id: 1,
  name: () => t('flowChart.templates.simpleProcess') || 'Simple Process Flowchart',
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
    <!-- Start Node (Oval) -->
    <ellipse cx="300" cy="50" rx="80" ry="30" fill="#c8e6ff" stroke="#4169e1" stroke-width="2" />
    <text x="300" y="55" font-size="16" text-anchor="middle" fill="#000">Start</text>
    
    <!-- Process 1 (Rectangle) -->
    <rect x="240" y="120" width="120" height="60" fill="#ffffc8" stroke="#ffd700" stroke-width="2" />
    <text x="300" y="155" font-size="16" text-anchor="middle" fill="#000">Process 1</text>
    
    <!-- Decision Diamond -->
    <polygon points="300,220 360,280 300,340 240,280" fill="#e6ffe6" stroke="#008000" stroke-width="2" />
    <text x="300" y="285" font-size="16" text-anchor="middle" fill="#008000">Decision?</text>
    
    <!-- Process 2 (Rectangle) - Yes path -->
    <rect x="440" y="250" width="120" height="60" fill="#ffffc8" stroke="#ffd700" stroke-width="2" />
    <text x="500" y="285" font-size="16" text-anchor="middle" fill="#000">Process 2</text>
    
    <!-- Process 3 (Rectangle) - No path -->
    <rect x="80" y="250" width="120" height="60" fill="#ffffc8" stroke="#ffd700" stroke-width="2" />
    <text x="140" y="285" font-size="16" text-anchor="middle" fill="#000">Process 3</text>
    
    <!-- End Node (Oval) -->
    <ellipse cx="300" cy="400" rx="80" ry="30" fill="#ffe6e6" stroke="#dc143c" stroke-width="2" />
    <text x="300" y="405" font-size="16" text-anchor="middle" fill="#000">End</text>
    
    <!-- Connections -->
    <line x1="300" y1="80" x2="300" y2="120" stroke="#000" stroke-width="2" marker-end="url(#arrowhead)" />
    <line x1="300" y1="180" x2="300" y2="220" stroke="#000" stroke-width="2" marker-end="url(#arrowhead)" />
    <line x1="360" y1="280" x2="440" y2="280" stroke="#000" stroke-width="2" marker-end="url(#arrowhead)" />
    <text x="400" y="270" font-size="14" text-anchor="middle" fill="#000">Y</text>
    <line x1="240" y1="280" x2="200" y2="280" stroke="#000" stroke-width="2" marker-end="url(#arrowhead)" />
    <text x="220" y="270" font-size="14" text-anchor="middle" fill="#000">N</text>
    <line x1="140" y1="310" x2="140" y2="350" stroke="#000" stroke-width="2" />
    <line x1="140" y1="350" x2="300" y2="350" stroke="#000" stroke-width="2" />
    <line x1="300" y1="350" x2="300" y2="370" stroke="#000" stroke-width="2" marker-end="url(#arrowhead)" />
    <line x1="500" y1="310" x2="500" y2="350" stroke="#000" stroke-width="2" />
    <line x1="500" y1="350" x2="300" y2="350" stroke="#000" stroke-width="2" />
    
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
      </marker>
    </defs>
  </svg>`,
  data: {
    nodes: [
      { 
        id: 'start', 
        type: 'default', 
        position: { x: 300, y: 50 }, 
        style: { 
          width: 160, 
          height: 60, 
          backgroundColor: '#c8e6ff', 
          color: '#000', 
          borderColor: '#4169e1',
          borderWidth: 2,
          borderRadius: 30,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
        data: { 
          label: locale.value === 'fr' ? 'Début' : 'Start' 
        } 
      },
      { 
        id: 'process1', 
        type: 'default', 
        position: { x: 300, y: 150 }, 
        style: { 
          width: 120, 
          height: 60, 
          backgroundColor: '#ffffc8', 
          color: '#000', 
          borderColor: '#ffd700',
          borderWidth: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
        data: { 
          label: locale.value === 'fr' ? 'Processus 1' : 'Process 1' 
        } 
      },
      { 
        id: 'decision', 
        type: 'special', 
        position: { x: 300, y: 280 }, 
        style: { 
          width: 120, 
          height: 120, 
          backgroundColor: '#e6ffe6', 
          color: '#008000', 
          borderColor: '#008000',
          borderWidth: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
        data: { 
          label: locale.value === 'fr' ? 'Décision?' : 'Decision?' 
        } 
      },
      { 
        id: 'process2', 
        type: 'default', 
        position: { x: 500, y: 280 }, 
        style: { 
          width: 120, 
          height: 60, 
          backgroundColor: '#ffffc8', 
          color: '#000', 
          borderColor: '#ffd700',
          borderWidth: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
        data: { 
          label: locale.value === 'fr' ? 'Processus 2' : 'Process 2' 
        } 
      },
      { 
        id: 'process3', 
        type: 'default', 
        position: { x: 140, y: 280 }, 
        style: { 
          width: 120, 
          height: 60, 
          backgroundColor: '#ffffc8', 
          color: '#000', 
          borderColor: '#ffd700',
          borderWidth: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
        data: { 
          label: locale.value === 'fr' ? 'Processus 3' : 'Process 3' 
        } 
      },
      { 
        id: 'end', 
        type: 'default', 
        position: { x: 300, y: 400 }, 
        style: { 
          width: 160, 
          height: 60, 
          backgroundColor: '#ffe6e6', 
          color: '#000', 
          borderColor: '#dc143c',
          borderWidth: 2,
          borderRadius: 30,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        },
        data: { 
          label: locale.value === 'fr' ? 'Fin' : 'End' 
        } 
      }
    ],
    edges: [
      { id: 'e-start-process1', source: 'start', target: 'process1', style: { strokeWidth: 2 } },
      { id: 'e-process1-decision', source: 'process1', target: 'decision', style: { strokeWidth: 2 } },
      { id: 'e-decision-process2', source: 'decision', target: 'process2', label: 'Y', labelStyle: { fill: '#000' }, style: { strokeWidth: 2 } },
      { id: 'e-decision-process3', source: 'decision', target: 'process3', label: 'N', labelStyle: { fill: '#000' }, style: { strokeWidth: 2 } },
      { id: 'e-process2-end', source: 'process2', target: 'end', style: { strokeWidth: 2 } },
      { id: 'e-process3-end', source: 'process3', target: 'end', style: { strokeWidth: 2 } }
    ]
  }
},
  {
    id: 2,
    name: () => t('flowChart.templates.kanban') || 'Kanban Board',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
      <!-- Columns Headers -->
      <rect x="50" y="50" width="220" height="60" rx="3" ry="3" fill="#e0e0e0" stroke="#d0d0d0" stroke-width="1" />
      <text x="160" y="85" font-size="18" text-anchor="middle" fill="#555">Backlog</text>
      
      <rect x="290" y="50" width="220" height="60" rx="3" ry="3" fill="#e0e0e0" stroke="#d0d0d0" stroke-width="1" />
      <text x="400" y="85" font-size="18" text-anchor="middle" fill="#555">In Progress</text>
      
      <rect x="530" y="50" width="220" height="60" rx="3" ry="3" fill="#e0e0e0" stroke="#d0d0d0" stroke-width="1" />
      <text x="640" y="85" font-size="18" text-anchor="middle" fill="#555">Task done</text>
      
      <!-- Backlog Cards -->
      <rect x="55" y="120" width="210" height="100" rx="5" ry="5" fill="#ffffff" stroke="#d0d0d0" stroke-width="1" />
      <rect x="55" y="120" width="5" height="100" rx="2" ry="2" fill="#4285f4" />
      <text x="65" y="145" font-size="14" font-weight="bold" fill="#333">Create User Login</text>
      <text x="65" y="165" font-size="12" fill="#666">Implement User Authentication</text>
      <text x="65" y="195" font-size="12" fill="#666">Priority: High</text>
      
      <rect x="55" y="230" width="210" height="100" rx="5" ry="5" fill="#ffffff" stroke="#d0d0d0" stroke-width="1" />
      <rect x="55" y="230" width="5" height="100" rx="2" ry="2" fill="#34a853" />
      <text x="65" y="255" font-size="14" font-weight="bold" fill="#333">Update Product API</text>
      <text x="65" y="275" font-size="12" fill="#666">Add endpoints for product filtering</text>
      <text x="65" y="305" font-size="12" fill="#666">Priority: Medium</text>
      
      <rect x="55" y="340" width="210" height="100" rx="5" ry="5" fill="#ffffff" stroke="#d0d0d0" stroke-width="1" />
      <rect x="55" y="340" width="5" height="100" rx="2" ry="2" fill="#fbbc05" />
      <text x="65" y="365" font-size="14" font-weight="bold" fill="#333">Documentation</text>
      <text x="65" y="385" font-size="12" fill="#666">Update API docs with new endpoints</text>
      <text x="65" y="415" font-size="12" fill="#666">Priority: Low</text>
      
      <!-- In Progress Cards -->
      <rect x="295" y="120" width="210" height="100" rx="5" ry="5" fill="#ffffff" stroke="#d0d0d0" stroke-width="1" />
      <rect x="295" y="120" width="5" height="100" rx="2" ry="2" fill="#4285f4" />
      <text x="305" y="145" font-size="14" font-weight="bold" fill="#333">Dashboard Design</text>
      <text x="305" y="165" font-size="12" fill="#666">Create UI mockups for dashboard</text>
      <text x="305" y="195" font-size="12" fill="#666">Assigned: Alex</text>
      
      <rect x="295" y="230" width="210" height="100" rx="5" ry="5" fill="#ffffff" stroke="#d0d0d0" stroke-width="1" />
      <rect x="295" y="230" width="5" height="100" rx="2" ry="2" fill="#34a853" />
      <text x="305" y="255" font-size="14" font-weight="bold" fill="#333">Database Migration</text>
      <text x="305" y="275" font-size="12" fill="#666">Update schema for new features</text>
      <text x="305" y="305" font-size="12" fill="#666">Assigned: Jane</text>
      
      <!-- Review/Done Cards -->
      <rect x="535" y="120" width="210" height="100" rx="5" ry="5" fill="#ffffff" stroke="#d0d0d0" stroke-width="1" />
      <rect x="535" y="120" width="5" height="100" rx="2" ry="2" fill="#4285f4" />
      <text x="545" y="145" font-size="14" font-weight="bold" fill="#333">Search Feature</text>
      <text x="545" y="165" font-size="12" fill="#666">Implement search functionality</text>
      <text x="545" y="195" font-size="12" fill="#666">Reviewer: Jordan</text>
      
      <rect x="535" y="230" width="210" height="100" rx="5" ry="5" fill="#ffffff" stroke="#d0d0d0" stroke-width="1" />
      <rect x="535" y="230" width="5" height="100" rx="2" ry="2" fill="#34a853" />
      <text x="545" y="255" font-size="14" font-weight="bold" fill="#333">Landing Page</text>
      <text x="545" y="275" font-size="12" fill="#666">Updated hero section with content</text>
      <text x="545" y="305" font-size="12" fill="#666">Complete</text>
      
      <!-- Add Task Button -->
      <rect x="60" y="460" width="120" height="30" rx="15" ry="15" fill="#7986cb" stroke="none" />
      <text x="120" y="480" font-size="14" text-anchor="middle" fill="#fff">+ Add Task</text>
    </svg>`,
    data: {
      nodes: [
        // Columns
        { 
          id: 'backlog-header', 
          type: 'default',
          position: { x: 100, y: 50 }, 
          style: { width: 220, textAlign: 'center', backgroundColor: '#e0e0e0', color: '#555', fontSize: '18px', padding: '15px' },
          data: { 
            label: locale.value === 'fr' ? 'Backlog' : 'Backlog' 
          } 
        },
        { 
          id: 'in-progress-header', 
          type: 'default',
          position: { x: 340, y: 50 }, 
          style: { width: 220, textAlign: 'center', backgroundColor: '#e0e0e0', color: '#555', fontSize: '18px', padding: '15px' },
          data: { 
            label: locale.value === 'fr' ? 'En Cours' : 'In Progress' 
          } 
        },
        { 
          id: 'review-done-header', 
          type: 'default',
          position: { x: 580, y: 50 }, 
          style: { width: 220, textAlign: 'center', backgroundColor: '#e0e0e0', color: '#555', fontSize: '18px', padding: '15px' },
          data: { 
            label: locale.value === 'fr' ? 'Tâche terminée' : 'Task done' 
          } 
        },
        
        // Backlog Cards
        { 
          id: 'task-1', 
          type: 'default',
          position: { x: 100, y: 150 }, 
          style: { 
            width: 210, 
            padding: '10px', 
            backgroundColor: 'white', 
            color: '#000',
            borderLeft: '5px solid #4285f4', 
            borderRadius: '5px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          },
          data: { 
            label: locale.value === 'fr' 
              ? 'Créer Login Utilisateur\nImplémenter Authentification Utilisateur\nPriorité: Élevée' 
              : 'Create User Login\nImplement User Authentication\nPriority: High'
          } 
        },
        { 
          id: 'task-2', 
          type: 'default',
          position: { x: 100, y: 250 }, 
          style: { 
            width: 210, 
            padding: '10px', 
            backgroundColor: 'white', 
            color: '#000',
            borderLeft: '5px solid #34a853', 
            borderRadius: '5px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          },
          data: { 
            label: locale.value === 'fr' 
              ? 'Mettre à jour l\'API Produit\nAjouter endpoints pour filtrage produits\nPriorité: Moyenne'
              : 'Update Product API\nAdd endpoints for product filtering\nPriority: Medium'
          } 
        },
        { 
          id: 'task-3', 
          type: 'default',
          position: { x: 100, y: 350 }, 
          style: { 
            width: 210, 
            padding: '10px', 
            backgroundColor: 'white', 
            color: '#000',
            borderLeft: '5px solid #fbbc05', 
            borderRadius: '5px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          },
          data: { 
            label: locale.value === 'fr' 
              ? 'Documentation\nMettre à jour docs API avec nouveaux endpoints\nPriorité: Basse'
              : 'Documentation\nUpdate API docs with new endpoints\nPriority: Low'
          } 
        },
        
        // In Progress Cards
        { 
          id: 'task-4', 
          type: 'default',
          position: { x: 340, y: 150 }, 
          style: { 
            width: 210, 
            padding: '10px', 
            backgroundColor: 'white', 
            color: '#000',
            borderLeft: '5px solid #4285f4', 
            borderRadius: '5px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          },
          data: { 
            label: locale.value === 'fr' 
              ? 'Design du Tableau de Bord\nCréer maquettes UI pour tableau de bord\nAssigné: Alex'
              : 'Dashboard Design\nCreate UI mockups for dashboard\nAssigned: Alex'
          } 
        },
        { 
          id: 'task-5', 
          type: 'default',
          position: { x: 340, y: 250 }, 
          style: { 
            width: 210, 
            padding: '10px', 
            backgroundColor: 'white', 
            color: '#000',
            borderLeft: '5px solid #34a853', 
            borderRadius: '5px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          },
          data: { 
            label: locale.value === 'fr' 
              ? 'Migration de Base de Données\nMettre à jour schéma pour nouvelles fonctionnalités\nAssigné: Jane'
              : 'Database Migration\nUpdate schema for new features\nAssigned: Jane'
          } 
        },
        
        // Review/Done Cards
        { 
          id: 'task-6', 
          type: 'default',
          position: { x: 580, y: 150 }, 
          style: { 
            width: 210, 
            padding: '10px', 
            backgroundColor: 'white', 
            color: '#000',
            borderLeft: '5px solid #4285f4', 
            borderRadius: '5px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          },
          data: { 
            label: locale.value === 'fr' 
              ? 'Fonctionnalité de Recherche\nImplémenter fonctionnalité de recherche\nVérificateur: Jordan'
              : 'Search Feature\nImplement search functionality\nReviewer: Jordan'
          } 
        },
        { 
          id: 'task-7', 
          type: 'default',
          position: { x: 580, y: 250 }, 
          style: { 
            width: 210, 
            padding: '10px', 
            backgroundColor: 'white', 
            color: '#000',
            borderLeft: '5px solid #34a853', 
            borderRadius: '5px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
          },
          data: { 
            label: locale.value === 'fr' 
              ? 'Page d\'Accueil\nSection héros mise à jour avec contenu\nTerminé'
              : 'Landing Page\nUpdated hero section with content\nComplete'
          } 
        },
        
        // Add Task Button
        { 
          id: 'add-task-button', 
          type: 'default',
          position: { x: 100, y: 450 }, 
          style: { 
            width: 120, 
            height: 36, 
            backgroundColor: '#7986cb', 
            color: 'white', 
            borderRadius: '18px', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            fontSize: '14px'
          },
          data: { 
            label: locale.value === 'fr' ? '+ Ajouter Tâche' : '+ Add Task' 
          } 
        }
      ],
      edges: []
    }
  },
  {
    id: 4,
    name: () => t('flowChart.templates.mindMap') || 'Mind Map',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450">
      <!-- Central Topic -->
      <ellipse cx="300" cy="70" rx="80" ry="40" fill="#e6f7ff" stroke="#6495ED" stroke-width="1" />
      <text x="300" y="75" font-size="14" text-anchor="middle" fill="#000">Central Topic</text>
      
      <!-- Main Branch 1 -->
      <rect x="150" y="180" width="140" height="50" rx="20" ry="20" fill="#ffffcc" stroke="#FFD700" stroke-width="1" />
      <text x="220" y="210" font-size="12" text-anchor="middle" fill="#000">Main Branch 1</text>
      
      <!-- Main Branch 2 -->
      <rect x="450" y="180" width="140" height="50" rx="20" ry="20" fill="#e6ffec" stroke="#228B22" stroke-width="1" />
      <text x="520" y="210" font-size="12" text-anchor="middle" fill="#000">Main Branch 2</text>
      
      <!-- Subtopic 1.1 -->
      <rect x="100" y="300" width="100" height="50" rx="5" ry="5" fill="#ffffff" stroke="#FFD700" stroke-width="1" />
      <text x="150" y="325" font-size="12" text-anchor="middle" fill="#000">Subtopic 1.1</text>
      
      <!-- Subtopic 1.2 -->
      <rect x="220" y="300" width="100" height="50" rx="5" ry="5" fill="#ffffff" stroke="#FFD700" stroke-width="1" />
      <text x="270" y="325" font-size="12" text-anchor="middle" fill="#000">Subtopic 1.2</text>
      
      <!-- Subtopic 2.1 -->
      <rect x="380" y="300" width="100" height="50" rx="5" ry="5" fill="#ffffff" stroke="#228B22" stroke-width="1" />
      <text x="430" y="325" font-size="12" text-anchor="middle" fill="#000">Subtopic 2.1</text>
      
      <!-- Subtopic 2.2 -->
      <rect x="500" y="300" width="100" height="50" rx="5" ry="5" fill="#ffffff" stroke="#228B22" stroke-width="1" />
      <text x="550" y="325" font-size="12" text-anchor="middle" fill="#000">Subtopic 2.2</text>
      
      <!-- Sub-subtopic -->
      <rect x="380" y="400" width="100" height="50" rx="5" ry="5" fill="#ffffff" stroke="#228B22" stroke-width="1" />
      <text x="430" y="425" font-size="12" text-anchor="middle" fill="#000">Sub-subtopic</text>
      
      <!-- Connections -->
      <path d="M270 100 L220 180" stroke="#FFD700" stroke-width="2" />
      <path d="M330 100 L450 180" stroke="#228B22" stroke-width="2" />
      <path d="M180 230 L150 300" stroke="#FFD700" stroke-width="2" />
      <path d="M240 230 L270 300" stroke="#FFD700" stroke-width="2" />
      <path d="M480 230 L430 300" stroke="#228B22" stroke-width="2" />
      <path d="M520 230 L550 300" stroke="#228B22" stroke-width="2" />
      <path d="M430 350 L430 400" stroke="#228B22" stroke-width="2" />
    </svg>`,
    data: {
      nodes: [
        { 
          id: 'central-topic', 
          type: 'default',
          position: { x: 300, y: 50 }, 
          style: { width: 160, height: 80, textAlign: 'center', backgroundColor: '#e6f7ff', color: '#000',borderColor: '#6495ED', borderWidth: 1, borderRadius: 40 },
          data: { 
            label: locale.value === 'fr' ? 'Sujet Central' : 'Central Topic' 
          } 
        },
        { 
          id: 'main-branch-1', 
          type: 'default',
          position: { x: 150, y: 180 }, 
          style: { width: 140, height: 50, textAlign: 'center', backgroundColor: '#ffffcc', color: '#000',borderColor: '#FFD700', borderWidth: 1, borderRadius: 25 },
          data: { 
            label: locale.value === 'fr' ? 'Branche Principale 1' : 'Main Branch 1' 
          } 
        },
        { 
          id: 'main-branch-2', 
          type: 'default',
          position: { x: 450, y: 180 }, 
          style: { width: 140, height: 50, textAlign: 'center', backgroundColor: '#e6ffec', color: '#000',borderColor: '#228B22', borderWidth: 1, borderRadius: 25 },
          data: { 
            label: locale.value === 'fr' ? 'Branche Principale 2' : 'Main Branch 2' 
          } 
        },
        { 
          id: 'subtopic-1-1', 
          type: 'default',
          position: { x: 100, y: 300 }, 
          style: { width: 100, height: 50, textAlign: 'center', backgroundColor: '#ffffff', color: '#000',borderColor: '#FFD700', borderWidth: 1, borderRadius: 5 },
          data: { 
            label: locale.value === 'fr' ? 'Sous-sujet 1.1' : 'Subtopic 1.1' 
          } 
        },
        { 
          id: 'subtopic-1-2', 
          type: 'default',
          position: { x: 220, y: 300 }, 
          style: { width: 100, height: 50, textAlign: 'center', backgroundColor: '#ffffff', color: '#000',borderColor: '#FFD700', borderWidth: 1, borderRadius: 5 },
          data: { 
            label: locale.value === 'fr' ? 'Sous-sujet 1.2' : 'Subtopic 1.2' 
          } 
        },
        { 
          id: 'subtopic-2-1', 
          type: 'default',
          position: { x: 380, y: 300 }, 
          style: { width: 100, height: 50, textAlign: 'center', backgroundColor: '#ffffff', color: '#000',borderColor: '#228B22', borderWidth: 1, borderRadius: 5 },
          data: { 
            label: locale.value === 'fr' ? 'Sous-sujet 2.1' : 'Subtopic 2.1' 
          } 
        },
        { 
          id: 'subtopic-2-2', 
          type: 'default',
          position: { x: 500, y: 300 }, 
          style: { width: 100, height: 50, textAlign: 'center', backgroundColor: '#ffffff', color: '#000',borderColor: '#228B22', borderWidth: 1, borderRadius: 5 },
          data: { 
            label: locale.value === 'fr' ? 'Sous-sujet 2.2' : 'Subtopic 2.2' 
          } 
        },
        { 
          id: 'sub-subtopic', 
          type: 'default',
          position: { x: 380, y: 400 }, 
          style: { width: 100, height: 50, textAlign: 'center', backgroundColor: '#ffffff', color: '#000',borderColor: '#228B22', borderWidth: 1, borderRadius: 5 },
          data: { 
            label: locale.value === 'fr' ? 'Sous-sous-sujet' : 'Sub-subtopic' 
          } 
        }
      ],
      edges: [
        { id: 'e-central-main1', source: 'central-topic', target: 'main-branch-1', style: { stroke: '#FFD700', strokeWidth: 2 } },
        { id: 'e-central-main2', source: 'central-topic', target: 'main-branch-2', style: { stroke: '#228B22', strokeWidth: 2 } },
        { id: 'e-main1-sub1-1', source: 'main-branch-1', target: 'subtopic-1-1', style: { stroke: '#FFD700', strokeWidth: 2 } },
        { id: 'e-main1-sub1-2', source: 'main-branch-1', target: 'subtopic-1-2', style: { stroke: '#FFD700', strokeWidth: 2 } },
        { id: 'e-main2-sub2-1', source: 'main-branch-2', target: 'subtopic-2-1', style: { stroke: '#228B22', strokeWidth: 2 } },
        { id: 'e-main2-sub2-2', source: 'main-branch-2', target: 'subtopic-2-2', style: { stroke: '#228B22', strokeWidth: 2 } },
        { id: 'e-sub2-1-subsub', source: 'subtopic-2-1', target: 'sub-subtopic', style: { stroke: '#228B22', strokeWidth: 2 } }
      ]
    }
  },
  {
    id: 5,
    name: () => t('flowChart.templates.decisionFlowchart') || 'Decision Flowchart',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500">
      <!-- Start Node (Ellipse) -->
      <ellipse cx="200" cy="50" rx="60" ry="30" fill="#e6f7ff" stroke="#6495ED" stroke-width="1" />
      <text x="200" y="55" font-size="12" text-anchor="middle" fill="#000">Start</text>
      
      <!-- Prepare Data Node (Rectangle) -->
      <rect x="140" y="120" width="120" height="50" fill="#ffffff" stroke="#6495ED" stroke-width="1" />
      <text x="200" y="150" font-size="12" text-anchor="middle" fill="#000">Prepare Data</text>
      
      <!-- Is Data Complete? Node (Diamond) -->
      <polygon points="200,200 260,250 200,300 140,250" fill="#fffde7" stroke="#6495ED" stroke-width="1" />
      <text x="200" y="255" font-size="12" text-anchor="middle" fill="#000">Is Data Complete?</text>
      
      <!-- Collect More Data Node (Rectangle) -->
      <rect x="40" y="225" width="120" height="50" fill="#ffffff" stroke="#6495ED" stroke-width="1" />
      <text x="100" y="255" font-size="12" text-anchor="middle" fill="#000">Collect More Data</text>
      
      <!-- Process Data Node (Rectangle) -->
      <rect x="300" y="225" width="120" height="50" fill="#ffffff" stroke="#6495ED" stroke-width="1" />
      <text x="360" y="255" font-size="12" text-anchor="middle" fill="#000">Process Data</text>
      
      <!-- Processing Successful? Node (Diamond) -->
      <polygon points="520,200 580,250 520,300 460,250" fill="#fffde7" stroke="#6495ED" stroke-width="1" />
      <text x="520" y="255" font-size="12" text-anchor="middle" fill="#000">Processing Successful?</text>
      
      <!-- Generate Report Node (Rectangle) -->
      <rect x="620" y="225" width="120" height="50" fill="#ffffff" stroke="#6495ED" stroke-width="1" />
      <text x="680" y="255" font-size="12" text-anchor="middle" fill="#000">Generate Report</text>
      
      <!-- Troubleshoot Node (Rectangle) -->
      <rect x="460" y="350" width="120" height="50" fill="#ffffff" stroke="#6495ED" stroke-width="1" />
      <text x="520" y="380" font-size="12" text-anchor="middle" fill="#000">Troubleshoot</text>
      
      <!-- End Node (Ellipse) -->
      <ellipse cx="680" cy="350" rx="60" ry="30" fill="#e6f7ff" stroke="#6495ED" stroke-width="1" />
      <text x="680" y="355" font-size="12" text-anchor="middle" fill="#000">End</text>
      
      <defs>
        <marker id="arrowhead2" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6495ED" />
        </marker>
      </defs>
      
      <!-- Arrows - Explicitly set fill="none" to avoid black boxes -->
      <path d="M200 80 L200 120" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      <path d="M200 170 L200 200" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      <path d="M140 250 L100 250" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      <path d="M100 275 L100 320 L200 320 L200 300" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      <path d="M260 250 L300 250" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      <path d="M420 250 L460 250" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      <path d="M520 300 L520 350" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      <path d="M460 375 L420 375 L420 250" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      <path d="M580 250 L620 250" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      <path d="M680 275 L680 320" stroke="#6495ED" stroke-width="1" marker-end="url(#arrowhead2)" fill="none" />
      
      <!-- Yes/No Labels -->
      <text x="275" y="240" font-size="10" fill="#6495ED">Y</text>
      <text x="150" y="240" font-size="10" fill="#6495ED">N</text>
      <text x="595" y="240" font-size="10" fill="#6495ED">Y</text>
      <text x="520" y="330" font-size="10" fill="#6495ED">N</text>
    </svg>`,
    data: {
      nodes: [
        { 
          id: 'start', 
          type: 'default',
          position: { x: 200, y: 30 }, 
          style: { width: 120, height: 60, textAlign: 'center', backgroundColor: '#e6f7ff', color: '#000',borderColor: '#6495ED', borderWidth: 1, borderRadius: 30 },
          data: { 
            label: locale.value === 'fr' ? 'Début' : 'Start' 
          } 
        },
        { 
          id: 'prepareData', 
          type: 'default',
          position: { x: 200, y: 120 }, 
          style: { width: 120, height: 50, textAlign: 'center', backgroundColor: 'white', color: '#000',borderColor: '#6495ED', borderWidth: 1 },
          data: { 
            label: locale.value === 'fr' ? 'Préparer les Données' : 'Prepare Data' 
          } 
        },
        { 
          id: 'isDataComplete', 
          type: 'special',
          position: { x: 200, y: 220 }, 
          style: { width: 120, height: 120, backgroundColor: '#fffde7', color: '#000',borderColor: '#6495ED', borderWidth: 1 },
          data: { 
            label: locale.value === 'fr' ? 'Les Données sont Complètes?' : 'Is Data Complete?' 
          } 
        },
        { 
          id: 'collectMoreData', 
          type: 'default',
          position: { x: 40, y: 220 }, 
          style: { width: 120, height: 50, textAlign: 'center', backgroundColor: 'white', color: '#000',borderColor: '#6495ED', borderWidth: 1 },
          data: { 
            label: locale.value === 'fr' ? 'Collecter Plus de Données' : 'Collect More Data' 
          } 
        },
        { 
          id: 'processData', 
          type: 'default',
          position: { x: 360, y: 220 }, 
          style: { width: 120, height: 50, textAlign: 'center', backgroundColor: 'white', color: '#000',borderColor: '#6495ED', borderWidth: 1 },
          data: { 
            label: locale.value === 'fr' ? 'Traiter les Données' : 'Process Data' 
          } 
        },
        { 
          id: 'processingSuccessful', 
          type: 'special',
          position: { x: 520, y: 220 }, 
          style: { width: 120, height: 120, backgroundColor: '#fffde7', color: '#000',borderColor: '#6495ED', borderWidth: 1 },
          data: { 
            label: locale.value === 'fr' ? 'Traitement Réussi?' : 'Processing Successful?' 
          } 
        },
        { 
          id: 'generateReport', 
          type: 'default',
          position: { x: 680, y: 220 }, 
          style: { width: 120, height: 50, textAlign: 'center', backgroundColor: 'white',color: '#000', borderColor: '#6495ED', borderWidth: 1 },
          data: { 
            label: locale.value === 'fr' ? 'Générer le Rapport' : 'Generate Report' 
          } 
        },
        { 
          id: 'troubleshoot', 
          type: 'default',
          position: { x: 520, y: 350 }, 
          style: { width: 120, height: 50, textAlign: 'center', backgroundColor: 'white', color: '#000',borderColor: '#6495ED', borderWidth: 1 },
          data: { 
            label: locale.value === 'fr' ? 'Dépanner' : 'Troubleshoot' 
          } 
        },
        { 
          id: 'end', 
          type: 'default',
          position: { x: 680, y: 350 }, 
          style: { width: 120, height: 60, textAlign: 'center', backgroundColor: '#e6f7ff',color: '#000', borderColor: '#6495ED', borderWidth: 1, borderRadius: 30 },
          data: { 
            label: locale.value === 'fr' ? 'Fin' : 'End' 
          } 
        }
      ],
      edges: [
        { id: 'e1-2', source: 'start', target: 'prepareData', style: { stroke: '#6495ED', strokeWidth: 1 } },
        { id: 'e2-3', source: 'prepareData', target: 'isDataComplete', style: { stroke: '#6495ED', strokeWidth: 1 } },
        { id: 'e3-4', source: 'isDataComplete', target: 'collectMoreData', label: 'N', labelStyle: { fill: '#6495ED' }, style: { stroke: '#6495ED', strokeWidth: 1 } },
        { id: 'e4-3', source: 'collectMoreData', target: 'isDataComplete', style: { stroke: '#6495ED', strokeWidth: 1 } },
        { id: 'e3-5', source: 'isDataComplete', target: 'processData', label: 'Y', labelStyle: { fill: '#6495ED' }, style: { stroke: '#6495ED', strokeWidth: 1 } },
        { id: 'e5-6', source: 'processData', target: 'processingSuccessful', style: { stroke: '#6495ED', strokeWidth: 1 } },
        { id: 'e6-8', source: 'processingSuccessful', target: 'troubleshoot', label: 'N', labelStyle: { fill: '#6495ED' }, style: { stroke: '#6495ED', strokeWidth: 1 } },
        { id: 'e8-5', source: 'troubleshoot', target: 'processData', style: { stroke: '#6495ED', strokeWidth: 1 } },
        { id: 'e6-7', source: 'processingSuccessful', target: 'generateReport', label: 'Y', labelStyle: { fill: '#6495ED' }, style: { stroke: '#6495ED', strokeWidth: 1 } },
        { id: 'e7-9', source: 'generateReport', target: 'end', style: { stroke: '#6495ED', strokeWidth: 1 } }
      ]
    }
  }
]);

function updateTemplateLabels() {
  templates.value.forEach(template => {
    // Update node labels based on current language
    template.data.nodes.forEach(node => {
      if (node.id === 'start' || node.id.includes('start')) {
        node.data.label = locale.value === 'fr' ? 'Début' : 'Start';
      } else if (node.id === 'end' || node.id.includes('end')) {
        node.data.label = locale.value === 'fr' ? 'Fin' : 'End';
      } else if (node.id === 'process' || node.id.includes('process')) {
        node.data.label = locale.value === 'fr' ? 'Processus' : 'Process';
      }
      
      // Template specific translations
      if (template.id === 2) { // Kanban
        if (node.id === 'todo-header') {
          node.data.label = locale.value === 'fr' ? 'À Faire' : 'To Do';
        } else if (node.id === 'in-progress-header') {
          node.data.label = locale.value === 'fr' ? 'En Cours' : 'In Progress';
        } else if (node.id === 'done-header') {
          node.data.label = locale.value === 'fr' ? 'Terminé' : 'Done';
        } else if (node.id.includes('todo-') || node.id.includes('in-progress-') || node.id.includes('done-')) {
          const taskNum = node.id.split('-')[1];
          node.data.label = locale.value === 'fr' ? `Tâche ${taskNum}` : `Task ${taskNum}`;
        }
      }  else if (template.id === 4) { // Mind Map
        if (node.id === 'central-topic') {
          node.data.label = locale.value === 'fr' ? 'Sujet Central' : 'Central Topic';
        } else if (node.id === 'main-branch-1') {
          node.data.label = locale.value === 'fr' ? 'Branche Principale 1' : 'Main Branch 1';
        } else if (node.id === 'main-branch-2') {
          node.data.label = locale.value === 'fr' ? 'Branche Principale 2' : 'Main Branch 2';
        } else if (node.id === 'subtopic-1-1') {
          node.data.label = locale.value === 'fr' ? 'Sous-sujet 1.1' : 'Subtopic 1.1';
        } else if (node.id === 'subtopic-1-2') {
          node.data.label = locale.value === 'fr' ? 'Sous-sujet 1.2' : 'Subtopic 1.2';
        } else if (node.id === 'subtopic-2-1') {
          node.data.label = locale.value === 'fr' ? 'Sous-sujet 2.1' : 'Subtopic 2.1';
        } else if (node.id === 'subtopic-2-2') {
          node.data.label = locale.value === 'fr' ? 'Sous-sujet 2.2' : 'Subtopic 2.2';
        } else if (node.id === 'sub-subtopic') {
          node.data.label = locale.value === 'fr' ? 'Sous-sous-sujet' : 'Sub-subtopic';
        }
      }
    });
    
    // Update edge labels for decision flowchart
    if (template.id === 5) { // Decision Flowchart
      template.data.edges.forEach(edge => {
        if (edge.label === 'Yes' || edge.label === 'Oui') {
          edge.label = locale.value === 'fr' ? 'Oui' : 'Yes';
        } else if (edge.label === 'No' || edge.label === 'Non') {
          edge.label = locale.value === 'fr' ? 'Non' : 'No';
        }
      });
    }
  });
}

function close() {
  emit('update:modelValue', false);
}

function selectTemplate(template) {
  // Make sure labels are up to date with current language before importing
  updateTemplateLabels();
  emit('select-template', template.data);
  close();
}
</script>

<template>
  <v-dialog v-model="props.modelValue" max-width="800px">
    <v-card>
      <v-card-title>
        {{ t('flowChart.selectTemplate') || 'Select Template' }}
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col v-for="template in templates" :key="template.id" cols="12" sm="6">
            <v-card @click="selectTemplate(template)" class="template-card" hover>
              <v-card-title class="text-subtitle-1">{{ template.name() }}</v-card-title>
              <v-card-text class="d-flex justify-center">
                <div class="template-preview" v-html="template.svg"></div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="blue-darken-1" variant="text" @click="close">
          {{ t('common.cancel') || 'Cancel' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.template-card {
  cursor: pointer;
  transition: all 0.2s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.template-card:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}

.template-preview {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 8px;
  margin-top: 8px;
}

.template-preview :deep(svg) {
  max-width: 100%;
  max-height: 100%;
}
</style>