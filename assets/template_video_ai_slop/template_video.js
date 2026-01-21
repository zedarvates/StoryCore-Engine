// Template vidéo AI slop

const { animationIntroduction, animationPlacementProduit, animationAppelAction, animationConclusion } = require('./animations');
const { effetCouleurVive, effetDouxSynthetique, effetPicDopamine } = require('./effets_speciaux');

// Fonction pour créer une section de placement de produit
function creerSectionPlacementProduit(produit, description) {
    console.log(`Création de la section pour le produit : ${produit}`);
    animationPlacementProduit(produit);
    effetCouleurVive();
    console.log(`Description du produit : ${description}`);
}

// Fonction pour créer un appel à l'action
function creerAppelAction(message) {
    console.log(`Création de l'appel à l'action : ${message}`);
    animationAppelAction(message);
    effetPicDopamine();
}

// Fonction pour générer le template vidéo complet
function genererTemplateVideo(produits) {
    console.log("Début de la génération du template vidéo AI slop");
    
    // Introduction
    animationIntroduction();
    effetDouxSynthetique();
    
    // Sections de placement de produit
    produits.forEach(produit => {
        creerSectionPlacementProduit(produit.nom, produit.description);
        creerAppelAction(produit.appelAction);
    });
    
    // Conclusion
    animationConclusion();
    console.log("Fin de la génération du template vidéo AI slop");
}

// Exemple d'utilisation
const produits = [
    {
        nom: "Produit 1",
        description: "Description du Produit 1",
        appelAction: "Achetez maintenant !"
    },
    {
        nom: "Produit 2",
        description: "Description du Produit 2",
        appelAction: "Cliquez ici pour en savoir plus !"
    }
];

genererTemplateVideo(produits);

// Export des fonctions pour utilisation dans d'autres fichiers
module.exports = {
    creerSectionPlacementProduit,
    creerAppelAction,
    genererTemplateVideo
};