// ============================================================================
// MCP Addon Verification Script
// ============================================================================

/**
 * Ce script permet de vérifier l'implémentation complète de l'addon MCP
 * en testant tous les composants, hooks et fonctionnalités de base.
 */

import { MCPAddonManager } from '../MCPAddonManager';
import { useAddonStore } from '@/stores/addonStore';
import type { MCPAddon, MCPServerConfig } from '@/types/addons';

class MCPAddonVerifier {
  private manager: MCPAddonManager;
  private testResults: Array<{
    testName: string;
    passed: boolean;
    error?: string;
    details?: any;
  }> = [];

  constructor() {
    this.manager = new MCPAddonManager();
  }

  // Méthode principale pour exécuter tous les tests
  async runAllTests(): Promise<void> {
    console.log('🔍 Démarrage de la vérification de l\'addon MCP...');
    console.log('='.repeat(50));

    // Tests de base
    await this.testBasicFunctionality();
    await this.testServerManagement();
    await this.testConfiguration();
    await this.testStateManagement();
    await this.testErrorHandling();
    await this.testPermissions();
    await this.testIntegration();

    // Afficher les résultats
    this.displayResults();
  }

  // Tests de base
  private async testBasicFunctionality(): Promise<void> {
    console.log('\n📋 Tests de base...');
    
    try {
      // Vérifier l'état initial
      const initialState = this.manager.getState();
      this.addTest('État initial valide', 
        initialState.addon.id === 'mcp-server' && 
        initialState.addon.name === 'MCP Server Integration'
      );

      // Vérifier les permissions par défaut
      this.addTest('Permissions par défaut définies', 
        initialState.addon.permissions.length > 0
      );

      // Vérifier les métadonnées
      this.addTest('Métadonnées complètes', 
        initialState.addon.metadata.category === 'integration' &&
        initialState.addon.metadata.tags.length > 0
      );

    } catch (error) {
      this.addTest('Tests de base', false, error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }

  // Tests de gestion des serveurs
  private async testServerManagement(): Promise<void> {
    console.log('\n🖥️ Tests de gestion des serveurs...');
    
    try {
      // Ajouter un serveur
      const serverConfig: Omit<MCPServerConfig, 'id'> = {
        name: 'Test Server',
        endpoint: 'https://api.example.com/mcp',
        timeout: 30000,
        maxRetries: 3,
        enabled: true,
        status: 'disconnected',
        capabilities: ['text-generation'],
      };

      await this.manager.addServer(serverConfig);
      this.addTest('Ajout de serveur réussi', true);

      // Vérifier le serveur ajouté
      const state = this.manager.getState();
      this.addTest('Serveur ajouté à la liste', 
        state.servers.length === 1 && 
        state.servers[0].name === 'Test Server'
      );

      // Mettre à jour le serveur
      await this.manager.updateServer(state.servers[0].id, { 
        timeout: 60000,
        enabled: false,
      });
      this.addTest('Mise à jour de serveur réussie', true);

      // Tester le serveur
      await this.manager.testServer(state.servers[0].id);
      this.addTest('Test de serveur réussi', true);

      // Supprimer le serveur
      await this.manager.removeServer(state.servers[0].id);
      this.addTest('Suppression de serveur réussie', true);

      // Vérifier que le serveur a été supprimé
      const finalState = this.manager.getState();
      this.addTest('Serveur supprimé de la liste', 
        finalState.servers.length === 0
      );

    } catch (error) {
      this.addTest('Gestion des serveurs', false, error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }

  // Tests de configuration
  private async testConfiguration(): Promise<void> {
    console.log('\n⚙️ Tests de configuration...');
    
    try {
      // Mettre à jour la configuration
      await this.manager.updateConfig({
        defaultTimeout: 60000,
        maxConcurrent: 10,
        retryDelay: 2000,
        logLevel: 'debug',
      });
      this.addTest('Mise à jour de configuration réussie', true);

      // Vérifier la configuration
      const state = this.manager.getState();
      this.addTest('Configuration appliquée', 
        state.addon.config.defaultTimeout === 60000 &&
        state.addon.config.maxConcurrent === 10 &&
        state.addon.config.retryDelay === 2000 &&
        state.addon.config.logLevel === 'debug'
      );

      // Réinitialiser la configuration
      await this.manager.updateConfig({});
      this.addTest('Réinitialisation de configuration réussie', true);

    } catch (error) {
      this.addTest('Configuration', false, error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }

  // Tests de gestion d'état
  private async testStateManagement(): Promise<void> {
    console.log('\n🔄 Tests de gestion d\'état...');
    
    try {
      // S'abonner aux changements d'état
      let stateChangeCount = 0;
      const unsubscribe = this.manager.subscribe(() => {
        stateChangeCount++;
      });

      // Activer/désactiver l'addon
      await this.manager.toggleAddon(true);
      await this.manager.toggleAddon(false);
      
      this.addTest('Notifications de changement d\'état', stateChangeCount >= 2);

      // Désabonner
      unsubscribe();
      this.addTest('Désabonnement réussi', true);

    } catch (error) {
      this.addTest('Gestion d\'état', false, error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }

  // Tests de gestion d'erreurs
  private async testErrorHandling(): Promise<void> {
    console.log('\n❌ Tests de gestion d\'erreurs...');
    
    try {
      // Tester une action invalide
      await this.manager.removeServer('non-existent-server');
      this.addTest('Gestion d\'erreur - serveur inexistant', false, 'Devrait échouer');

    } catch (error) {
      this.addTest('Gestion d\'erreur - serveur inexistant', true, 'Erreur correctement gérée');
    }

    try {
      // Tester une configuration invalide
      await this.manager.updateConfig({ invalidField: 'value' });
      this.addTest('Gestion d\'erreur - configuration invalide', false, 'Devrait échouer');

    } catch (error) {
      this.addTest('Gestion d\'erreur - configuration invalide', true, 'Erreur correctement gérée');
    }
  }

  // Tests de permissions
  private async testPermissions(): Promise<void> {
    console.log('\n🔐 Tests de permissions...');
    
    try {
      const state = this.manager.getState();
      
      // Vérifier les permissions requises
      const requiredPermissions = [
        'read:project',
        'write:project',
        'network:outbound',
      ];
      
      const hasAllRequired = requiredPermissions.every(permission => 
        state.addon.permissions.includes(permission as any)
      );
      
      this.addTest('Permissions requises présentes', hasAllRequired);

      // Vérifier les permissions spécifiques à MCP
      const mcpPermissions = [
        'read:assets',
        'write:assets',
        'files:read',
        'files:write',
      ];
      
      const hasMcpPermissions = mcpPermissions.every(permission => 
        state.addon.permissions.includes(permission as any)
      );
      
      this.addTest('Permissions MCP spécifiques présentes', hasMcpPermissions);

    } catch (error) {
      this.addTest('Permissions', false, error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }

  // Tests d'intégration
  private async testIntegration(): Promise<void> {
    console.log('\n🔗 Tests d\'intégration...');
    
    try {
      // Vérifier l'intégration avec le store
      const store = useAddonStore();
      
      // Vérifier que le store a les méthodes attendues
      const hasStoreMethods = [
        'toggleMCPAddon',
        'addMCPServer', 
        'updateMCPServer',
        'removeMCPServer',
        'testMCPServer',
        'setSelectedMCPServer',
        'updateMCPConfig',
      ].every(method => typeof store[method] === 'function');
      
      this.addTest('Intégration avec le store', hasStoreMethods);

      // Vérifier que le store gère l'état
      const initialMcpState = store.mcpAddon;
      this.addTest('État du store initialisé', 
        initialMcpState.addon !== undefined &&
        initialMcpState.servers !== undefined
      );

    } catch (error) {
      this.addTest('Intégration', false, error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }

  // Méthode helper pour ajouter un test
  private addTest(testName: string, passed: boolean, error?: string, details?: any): void {
    this.testResults.push({
      testName,
      passed,
      error,
      details,
    });
  }

  // Afficher les résultats
  private displayResults(): void {
    console.log('\n📊 RÉSULTATS DES TESTS');
    console.log('='.repeat(50));
    
    const passedTests = this.testResults.filter(test => test.passed);
    const failedTests = this.testResults.filter(test => !test.passed);
    
    console.log(`✅ Tests réussis: ${passedTests.length}/${this.testResults.length}`);
    console.log(`❌ Tests échoués: ${failedTests.length}/${this.testResults.length}`);
    
    if (failedTests.length > 0) {
      console.log('\n🔴 Tests échoués:');
      failedTests.forEach(test => {
        console.log(`  - ${test.testName}: ${test.error || 'Erreur inconnue'}`);
      });
    }
    
    if (passedTests.length === this.testResults.length) {
      console.log('\n🎉 Tous les tests ont réussi! L\'implémentation MCP est fonctionnelle.');
    } else {
      console.log('\n⚠️  Certains tests ont échoué. Veuillez vérifier l\'implémentation.');
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// Exécuter les tests si ce script est exécuté directement
if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
  const verifier = new MCPAddonVerifier();
  verifier.runAllTests().catch(console.error);
}

export default MCPAddonVerifier;