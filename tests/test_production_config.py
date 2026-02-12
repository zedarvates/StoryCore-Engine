import pytest
import os
import yaml


class TestProductionConfiguration:
    """Tests de validation de la configuration production"""
    
    def test_docker_compose_valid(self):
        """Valider que docker-compose.yml est syntaxiquement correct"""
        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)
        assert config is not None
        assert "services" in config
        assert "version" in config
    
    def test_prometheus_config_valid(self):
        """Valider la configuration Prometheus"""
        with open("monitoring/prometheus/prometheus.yml", "r") as f:
            config = yaml.safe_load(f)
        assert config is not None
        assert "scrape_configs" in config
    
    def test_production_config_has_required_fields(self):
        """Valider les champs requis dans production-config.yaml"""
        with open("deployment/production-config.yaml", "r") as f:
            config = yaml.safe_load(f)
        
        assert config is not None
        assert "backend" in config
        assert "database" in config
        assert "redis" in config
    
    def test_environment_template_complete(self):
        """Valider que .env.example est complet"""
        with open(".env.example", "r") as f:
            content = f.read()
        
        required_vars = [
            "JWT_SECRET",
            "DATABASE_URL",
            "REDIS_URL",
            "GRAFANA_PASSWORD"
        ]
        
        for var in required_vars:
            assert var in content, f"{var} manquant dans .env.example"
    
    def test_dockerfile_has_healthcheck(self):
        """Valider que le Dockerfile contient un healthcheck"""
        with open("Dockerfile", "r") as f:
            content = f.read()
        assert "HEALTHCHECK" in content
    
    def test_ci_workflow_has_required_jobs(self):
        """Valider les jobs requis dans CI"""
        with open(".github/workflows/ci.yml", "r") as f:
            config = yaml.safe_load(f)
        
        jobs = [job for job in config.get("jobs", {})]
        required_jobs = ["test", "security", "build"]
        
        for job in required_jobs:
            assert job in jobs, f"Job {job} manquant dans CI"


class TestDockerServices:
    """Tests des services Docker"""
    
    def test_all_services_have_restart_policy(self):
        """Valider que tous les services ont une politique de restart"""
        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)
        
        for service_name, service in config.get("services", {}).items():
            assert "restart" in service, f"Service {service_name} sans restart policy"
    
    def test_dependencies_defined(self):
        """Valider que les dépendances sont définies"""
        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)
        
        backend = config["services"]["backend"]
        assert "depends_on" in backend, "Backend sans dépendances"
    
    def test_backend_has_healthcheck(self):
        """Valider que le backend a un healthcheck"""
        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)
        
        backend = config["services"]["backend"]
        assert "healthcheck" in backend, "Backend sans healthcheck"
    
    def test_ports_are_valid(self):
        """Valider que les ports sont correctement configurés"""
        with open("docker-compose.yml", "r") as f:
            config = yaml.safe_load(f)
        
        for service_name, service in config.get("services", {}).items():
            if "ports" in service:
                for port_mapping in service["ports"]:
                    assert ":" in str(port_mapping), f"Port invalide pour {service_name}"


class TestMonitoringConfiguration:
    """Tests de la configuration de monitoring"""
    
    def test_prometheus_has_scrape_targets(self):
        """Valider que Prometheus a des targets de scraping"""
        with open("monitoring/prometheus/prometheus.yml", "r") as f:
            config = yaml.safe_load(f)
        
        assert len(config.get("scrape_configs", [])) > 0, "Pas de scrape configs"
    
    def test_grafana_provisioning_exists(self):
        """Valider que la configuration Grafana existe"""
        assert os.path.exists("monitoring/grafana/provisioning/dashboards/dashboard.yml")
        assert os.path.exists("monitoring/grafana/provisioning/datasources/datasource.yml")
    
    def test_grafana_datasource_has_prometheus(self):
        """Valider que Grafana a Prometheus comme datasource"""
        with open("monitoring/grafana/provisioning/datasources/datasource.yml", "r") as f:
            config = yaml.safe_load(f)
        
        datasources = config.get("datasources", [])
        has_prometheus = any(ds.get("name") == "Prometheus" for ds in datasources)
        assert has_prometheus, "Prometheus manquant dans les datasources"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
