from django.urls import path

from .views import (
    VMListView,
    VMDetailView,
    VMPowerView,
    VMPerformanceView,
    HostListView,
    HostPerformanceView,
    ClusterListView,
    DatastoreListView,
    DatastorePerformanceView,
    ResourcePoolListView,
)

urlpatterns = [
    path("vmware/vms", VMListView.as_view(), name="vmware-vms"),
    path("vmware/vms/<str:vm_id>", VMDetailView.as_view(), name="vmware-vm-detail"),
    path("vmware/vms/<str:vm_id>/power/<str:action>", VMPowerView.as_view(), name="vmware-vm-power"),
    path("vmware/vms/<str:vm_id>/performance", VMPerformanceView.as_view(), name="vmware-vm-performance"),
    path("vmware/hosts", HostListView.as_view(), name="vmware-hosts"),
    path("vmware/hosts/<str:host_id>/performance", HostPerformanceView.as_view(), name="vmware-host-performance"),
    path("vmware/clusters", ClusterListView.as_view(), name="vmware-clusters"),
    path("vmware/datastores", DatastoreListView.as_view(), name="vmware-datastores"),
    path("vmware/datastores/<str:datastore_id>/performance", DatastorePerformanceView.as_view(), name="vmware-datastore-performance"),
    path("vmware/resource-pools", ResourcePoolListView.as_view(), name="vmware-resource-pools"),
]
